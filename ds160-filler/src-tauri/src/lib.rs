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
        // In production: resources are inside resources/ within resource_dir
        let resource = app_handle
            .path()
            .resource_dir()
            .unwrap_or_else(|_| std::env::current_dir().unwrap_or_else(|_| PathBuf::from(".")));
        resource.join("resources")
    };

    let sidecar_path = project_dir.join("sidecar").join("run.js");

    eprintln!("[Tauri] Starting sidecar: {:?}", sidecar_path);
    eprintln!("[Tauri] Project dir (CWD for node): {:?}", project_dir);

    std::thread::spawn(move || {
        use std::process::{Command, Stdio};
        use std::io::{BufRead, BufReader};

        let child = Command::new("node")
            .arg(&sidecar_path)
            .arg(&email)
            .arg(&password)
            .current_dir(&project_dir) // CRITICAL: set CWD so require('../automation/queue') works
            .stdout(Stdio::piped())
            .stderr(Stdio::inherit()) // Let stderr flow to console (avoid deadlock)
            .stdin(Stdio::piped())    // We need stdin to send commands
            .spawn();

        match child {
            Ok(mut process) => {
                // Store stdin handle for sending commands later
                if let Some(stdin) = process.stdin.take() {
                    if let Some(state) = app_handle.try_state::<AppState>() {
                        *state.sidecar_stdin.lock().unwrap() = Some(stdin);
                    }
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
                eprintln!("[Tauri] Sidecar process exited: {:?}", exit_status);
                
                // Notify frontend that sidecar died
                let _ = app_handle.emit("automation-status", serde_json::json!({
                    "type": "disconnected",
                    "error": "Sidecar encerrado"
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

        // Mark sidecar as not running and clear stdin
        if let Some(state) = app_handle.try_state::<AppState>() {
            *state.sidecar_running.lock().unwrap() = false;
            *state.sidecar_stdin.lock().unwrap() = None;
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
        let _ = writeln!(stdin, r#"{{"action":"stop"}}"#);
    }
    *state.sidecar_stdin.lock().unwrap() = None;

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
        let _ = writeln!(stdin, r#"{{"action":"refresh"}}"#);
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
