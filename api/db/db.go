package db

import (
	"database/sql"
	"fmt"
	"os"

	_ "modernc.org/sqlite"
)

var DB *sql.DB

func Connect() error {
	dbPath := os.Getenv("DATABASE_PATH")
	if dbPath == "" {
		dbPath = "kanban.db"
	}

	var err error
	DB, err = sql.Open("sqlite", dbPath)
	if err != nil {
		return fmt.Errorf("unable to open database: %v", err)
	}

	// Enable foreign keys
	_, err = DB.Exec("PRAGMA foreign_keys = ON;")
	if err != nil {
		return fmt.Errorf("unable to enable foreign keys: %v", err)
	}

	if err := DB.Ping(); err != nil {
		return fmt.Errorf("unable to ping database: %v", err)
	}

	if err := initSchema(); err != nil {
		return fmt.Errorf("unable to initialize schema: %v", err)
	}

	return nil
}

func Close() {
	if DB != nil {
		DB.Close()
	}
}

func initSchema() error {
	schema := `
	CREATE TABLE IF NOT EXISTS users (
		id TEXT PRIMARY KEY,
		email TEXT UNIQUE NOT NULL,
		name TEXT,
		provider TEXT,
		provider_id TEXT,
		password_hash TEXT,
		is_verified BOOLEAN DEFAULT FALSE,
		verification_token TEXT,
		verification_token_expires_at DATETIME,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		UNIQUE(provider, provider_id)
	);

	CREATE TABLE IF NOT EXISTS boards (
		id TEXT PRIMARY KEY,
		user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		name TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS columns (
		board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
		id TEXT NOT NULL,
		name TEXT NOT NULL,
		color TEXT NOT NULL,
		collapsed BOOLEAN DEFAULT FALSE,
		"order" INTEGER NOT NULL,
		PRIMARY KEY (board_id, id)
	);

	CREATE TABLE IF NOT EXISTS labels (
		board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
		id TEXT NOT NULL,
		name TEXT NOT NULL,
		color TEXT NOT NULL,
		"group" TEXT DEFAULT '',
		PRIMARY KEY (board_id, id)
	);

	CREATE TABLE IF NOT EXISTS tasks (
		id TEXT PRIMARY KEY,
		board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
		column_id TEXT NOT NULL,
		title TEXT NOT NULL,
		description TEXT,
		priority TEXT NOT NULL,
		due_date TEXT,
		"order" INTEGER NOT NULL,
		creation_date DATETIME NOT NULL,
		change_date DATETIME NOT NULL,
		done_date DATETIME,
		FOREIGN KEY (board_id, column_id) REFERENCES columns(board_id, id) ON DELETE CASCADE
	);

	CREATE TABLE IF NOT EXISTS task_labels (
		task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
		label_id TEXT NOT NULL,
		board_id TEXT NOT NULL,
		FOREIGN KEY (board_id, label_id) REFERENCES labels(board_id, id) ON DELETE CASCADE,
		PRIMARY KEY (task_id, label_id)
	);

	CREATE TABLE IF NOT EXISTS column_history (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
		column_id TEXT NOT NULL,
		at DATETIME NOT NULL
	);

	CREATE TABLE IF NOT EXISTS settings (
		board_id TEXT PRIMARY KEY REFERENCES boards(id) ON DELETE CASCADE,
		show_priority BOOLEAN DEFAULT TRUE,
		show_due_date BOOLEAN DEFAULT TRUE,
		show_age BOOLEAN DEFAULT TRUE,
		show_change_date BOOLEAN DEFAULT TRUE,
		locale TEXT NOT NULL,
		default_priority TEXT NOT NULL,
		notification_days INTEGER DEFAULT 3
	);
	`
	_, err := DB.Exec(schema)
	return err
}
