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

    // Get path to sidecar script (relative to resource dir)
    let sidecar_path = app_handle
        .path()
        .resource_dir()
        .map(|p| p.join("sidecar").join("run.js"))
        .unwrap_or_else(|_| {
            // fallback for dev mode
            PathBuf::from("sidecar/run.js")
        });

    std::thread::spawn(move || {
        use std::process::{Command, Stdio};
        use std::io::{BufRead, BufReader};

        let child = Command::new("node")
            .arg(&sidecar_path)
            .arg(&email)
            .arg(&password)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn();

        match child {
            Ok(mut process) => {
                // Read stdout for status updates
                if let Some(stdout) = process.stdout.take() {
                    let reader = BufReader::new(stdout);
                    for line in reader.lines() {
                        if let Ok(line) = line {
                            // Try to parse as JSON status
                            if let Ok(status) = serde_json::from_str::<serde_json::Value>(&line) {
                                let _ = app_handle.emit("automation-status", &status);
                            } else {
                                println!("[Sidecar] {}", line);
                            }
                        }
                    }
                }
                // Wait for process to finish
                let _ = process.wait();
            }
            Err(e) => {
                eprintln!("[Sidecar] Failed to start: {}", e);
                let _ = app_handle.emit("automation-status", serde_json::json!({
                    "type": "error",
                    "error": format!("Falha ao iniciar automação: {}", e)
                }));
            }
        }

        // Mark sidecar as not running
        if let Some(state) = app_handle.try_state::<AppState>() {
            *state.sidecar_running.lock().unwrap() = false;
        }
    });
}

// ============================================================
// TAURI COMMANDS (equivalent to Electron IPC handlers)
// ============================================================

#[tauri::command]
fn login(
    app: AppHandle,
    state: State<AppState>,
    email: String,
    password: String,
) -> CommandResult {
    // Note: Supabase auth is now handled in the frontend via supabase-js
    // The backend just manages session persistence and starts the sidecar

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
        drop(running); // Release lock before spawn
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
    // TODO: kill sidecar process

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

// ============================================================
// APP SETUP
// ============================================================
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            login,
            get_saved_session,
            logout,
            get_version,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
