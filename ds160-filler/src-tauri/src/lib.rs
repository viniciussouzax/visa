use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, State};

// ============================================================
// STATE
// ============================================================
#[derive(Default)]
pub struct AppState {
    session: Mutex<Option<Session>>,
    sidecar_running: Mutex<bool>,
    sidecar_stdin: Mutex<Option<std::process::ChildStdin>>,
    sidecar_pid: Mutex<Option<u32>>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
struct Session {
    email: String,
    password: String,
}

#[derive(Serialize, Clone)]
struct CommandResult {
    success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    user: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    message: Option<String>,
}

fn session_file_path(app: &AppHandle) -> PathBuf {
    let data_dir = app.path().app_data_dir().expect("failed to get app data dir");
    fs::create_dir_all(&data_dir).ok();
    data_dir.join("session.json")
}

fn save_session(app: &AppHandle, session: &Session) {
    let path = session_file_path(app);
    let json = serde_json::to_string(session).unwrap();
    fs::write(path, json).ok();
}

fn load_session(app: &AppHandle) -> Option<Session> {
    let path = session_file_path(app);
    if path.exists() {
        let data = fs::read_to_string(path).ok()?;
        serde_json::from_str(&data).ok()
    } else {
        None
    }
}

fn clear_session(app: &AppHandle) {
    let path = session_file_path(app);
    fs::remove_file(path).ok();
}

// ============================================================
// SIDECAR MANAGEMENT
// ============================================================
fn start_sidecar(app: &AppHandle, email: &str, password: &str) {
    let app_handle = app.clone();
    let email = email.to_string();
    let password = password.to_string();

    // Resolve the project root directory (ds160-filler/)
    // In dev: cargo runs with CWD=src-tauri/, we need to go up one level
    // In production: use resource dir
    let project_dir = if cfg!(debug_assertions) {
        let cwd = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
        // If CWD ends with src-tauri, go up one level
        if cwd.ends_with("src-tauri") {
            cwd.parent().unwrap_or(&cwd).to_path_buf()
        } else {
            cwd
        }
    } else {
        // In production: executable is at <install_dir>/sends160.exe
        // Resources are at <install_dir>/resources/
        // Using current_exe() is more reliable than Tauri's resource_dir()
        let exe_path = std::env::current_exe()
            .unwrap_or_else(|_| PathBuf::from("."));
        let install_dir = exe_path.parent()
            .unwrap_or_else(|| std::path::Path::new("."))
            .to_path_buf();
        install_dir.join("resources")
    };

    let sidecar_path = project_dir.join("sidecar").join("run.js");

    eprintln!("[Tauri] Starting sidecar: {:?}", sidecar_path);
    eprintln!("[Tauri] Project dir (CWD for node): {:?}", project_dir);

    // Pre-flight checks
    if !sidecar_path.exists() {
        eprintln!("[Tauri] ERROR: run.js not found at {:?}", sidecar_path);
        let _ = app_handle.emit("automation-status", serde_json::json!({
            "type": "error",
            "error": "Arquivo sidecar/run.js não encontrado. Reinstale o aplicativo."
        }));
        return;
    }

    std::thread::spawn(move || {
        use std::process::{Command, Stdio};
        use std::io::{BufRead, BufReader};

        // Windows: hide console window for spawned node processes
        #[cfg(windows)]
        use std::os::windows::process::CommandExt;
        #[cfg(windows)]
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        // Emit sidecar path for debugging
        let _ = app_handle.emit("automation-status", serde_json::json!({
            "type": "log",
            "message": format!("Sidecar path: {:?}", sidecar_path)
        }));

        // Check if Node.js is available
        let mut node_check_cmd = Command::new("node");
        #[cfg(windows)]
        node_check_cmd.creation_flags(CREATE_NO_WINDOW);
        let node_check = node_check_cmd.arg("--version").output();
        if node_check.is_err() {
            eprintln!("[Tauri] ERROR: Node.js not found in PATH");
            let _ = app_handle.emit("automation-status", serde_json::json!({
                "type": "error",
                "error": "Node.js não encontrado. Instale o Node.js (https://nodejs.org) e reinicie o aplicativo."
            }));
            if let Some(state) = app_handle.try_state::<AppState>() {
                *state.sidecar_running.lock().unwrap() = false;
            }
            return;
        }

        let mut cmd = Command::new("node");
        cmd.arg(&sidecar_path)
            .arg(&email)
            .arg(&password)
            .current_dir(&project_dir) // CRITICAL: set CWD so require('../automation/queue') works
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())   // Capture stderr to forward errors to frontend
            .stdin(Stdio::piped());   // We need stdin to send commands
        #[cfg(windows)]
        cmd.creation_flags(CREATE_NO_WINDOW);
        let child = cmd.spawn();

        match child {
            Ok(mut process) => {
                // Store stdin handle and PID for sending commands later
                let pid = process.id();
                if let Some(state) = app_handle.try_state::<AppState>() {
                    *state.sidecar_pid.lock().unwrap() = Some(pid);
                }
                if let Some(stdin) = process.stdin.take() {
                    if let Some(state) = app_handle.try_state::<AppState>() {
                        *state.sidecar_stdin.lock().unwrap() = Some(stdin);
                    }
                }

                // Capture stderr in a separate thread — forward to frontend as log events
                let app_handle_stderr = app_handle.clone();
                if let Some(stderr) = process.stderr.take() {
                    std::thread::spawn(move || {
                        let reader = BufReader::new(stderr);
                        for line in reader.lines() {
                            if let Ok(line) = line {
                                eprintln!("[Sidecar] {}", line);
                                // Forward to frontend for visibility in Logs tab
                                let _ = app_handle_stderr.emit("automation-status", serde_json::json!({
                                    "type": "log",
                                    "message": line
                                }));
                            }
                        }
                    });
                }

                // Read stdout for status updates
                if let Some(stdout) = process.stdout.take() {
                    let reader = BufReader::new(stdout);
                    for line in reader.lines() {
                        if let Ok(line) = line {
                            // Try to parse as JSON status
                            if let Ok(status) = serde_json::from_str::<serde_json::Value>(&line) {
                                let _ = app_handle.emit("automation-status", &status);
                            } else {
                                eprintln!("[Sidecar stdout] {}", line);
                            }
                        }
                    }
                }
                // Wait for process to finish
                let exit_status = process.wait();
                let exit_msg = match &exit_status {
                    Ok(s) => format!("código: {}", s),
                    Err(e) => format!("erro: {}", e),
                };
                eprintln!("[Tauri] Sidecar process exited: {}", exit_msg);
                
                // Notify frontend that sidecar died
                let _ = app_handle.emit("automation-status", serde_json::json!({
                    "type": "disconnected",
                    "error": format!("Sidecar encerrado ({})", exit_msg)
                }));
            }
            Err(e) => {
                eprintln!("[Tauri] Failed to start sidecar: {}", e);
                let _ = app_handle.emit("automation-status", serde_json::json!({
                    "type": "error",
                    "error": format!("Falha ao iniciar automação: {}", e)
                }));
            }
        }

        // Mark sidecar as not running and clear stdin/pid
        if let Some(state) = app_handle.try_state::<AppState>() {
            *state.sidecar_running.lock().unwrap() = false;
            *state.sidecar_stdin.lock().unwrap() = None;
            *state.sidecar_pid.lock().unwrap() = None;
        }
    });
}

// ============================================================
// TAURI COMMANDS
// ============================================================

#[tauri::command]
fn login(
    app: AppHandle,
    state: State<AppState>,
    email: String,
    password: String,
) -> CommandResult {
    let session = Session {
        email: email.clone(),
        password: password.clone(),
    };
    save_session(&app, &session);
    *state.session.lock().unwrap() = Some(session);

    // Start sidecar automation
    let mut running = state.sidecar_running.lock().unwrap();
    if !*running {
        *running = true;
        drop(running);
        start_sidecar(&app, &email, &password);
    }

    CommandResult {
        success: true,
        user: Some(email),
        error: None,
        message: None,
    }
}

#[tauri::command]
fn get_saved_session(app: AppHandle) -> Option<Session> {
    load_session(&app)
}

#[tauri::command]
fn logout(app: AppHandle, state: State<AppState>) -> CommandResult {
    clear_session(&app);
    *state.session.lock().unwrap() = None;
    *state.sidecar_running.lock().unwrap() = false;

    // Send stop command to sidecar
    if let Some(ref mut stdin) = *state.sidecar_stdin.lock().unwrap() {
        use std::io::Write;
        let _ = stdin.write_all(b"{\"action\":\"stop\"}\n");
    }
    *state.sidecar_stdin.lock().unwrap() = None;

    // BUG-2 fix: Kill sidecar process tree as fallback (stdin may be broken)
    if let Some(pid) = state.sidecar_pid.lock().unwrap().take() {
        #[cfg(windows)]
        {
            use std::process::Command;
            use std::os::windows::process::CommandExt;
            // /T = kill child processes (Chromium), /F = force
            let _ = Command::new("taskkill")
                .args(&["/PID", &pid.to_string(), "/T", "/F"])
                .creation_flags(0x08000000) // CREATE_NO_WINDOW
                .output();
        }
        #[cfg(not(windows))]
        {
            use std::process::Command;
            let _ = Command::new("kill").args(&["-TERM", &pid.to_string()]).output();
        }
    }

    CommandResult {
        success: true,
        error: None,
        user: None,
        message: None,
    }
}

#[tauri::command]
fn get_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[tauri::command]
fn restart_app(app: AppHandle) {
    app.restart();
}

#[tauri::command]
fn refresh_queue(state: State<AppState>) -> CommandResult {
    if let Some(ref mut stdin) = *state.sidecar_stdin.lock().unwrap() {
        use std::io::Write;
        let _ = stdin.write_all(b"{\"action\":\"refresh\"}\n");
        CommandResult {
            success: true,
            error: None,
            user: None,
            message: Some("Refresh enviado".to_string()),
        }
    } else {
        CommandResult {
            success: false,
            error: Some("Automação não está rodando".to_string()),
            user: None,
            message: None,
        }
    }
}

// ============================================================
// APP SETUP
// ============================================================
use tauri::tray::TrayIconBuilder;
use tauri::menu::{MenuBuilder, MenuItemBuilder};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            login,
            get_saved_session,
            logout,
            get_version,
            restart_app,
            refresh_queue,
        ])
        .setup(|app| {
            // --- System Tray Menu ---
            let show_item = MenuItemBuilder::with_id("show", "Mostrar")
                .build(app)?;
            let quit_item = MenuItemBuilder::with_id("quit", "Sair")
                .build(app)?;
            let menu = MenuBuilder::new(app)
                .item(&show_item)
                .separator()
                .item(&quit_item)
                .build()?;

            // --- Tray Icon ---
            let _tray = TrayIconBuilder::with_id("main-tray")
                .menu(&menu)
                .tooltip("SENDS160 — Automação DS-160")
                .on_menu_event(|app, event| {
                    match event.id().as_ref() {
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.unminimize();
                                let _ = window.set_focus();
                            }
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let tauri::tray::TrayIconEvent::Click {
                        button: tauri::tray::MouseButton::Left,
                        button_state: tauri::tray::MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            // --- Close to tray (hide instead of quit) ---
            if let Some(window) = app.get_webview_window("main") {
                let window_clone = window.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = window_clone.hide();
                    }
                });
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
