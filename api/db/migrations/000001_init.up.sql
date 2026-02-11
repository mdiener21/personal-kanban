-- 000001_init.up.sql

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    provider TEXT NOT NULL, -- 'google', 'apple', 'microsoft'
    provider_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider, provider_id)
);

-- Boards table
CREATE TABLE IF NOT EXISTS boards (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Columns table
CREATE TABLE IF NOT EXISTS columns (
    board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    id TEXT NOT NULL,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    collapsed BOOLEAN DEFAULT FALSE,
    "order" INTEGER NOT NULL,
    PRIMARY KEY (board_id, id)
);

-- Labels table
CREATE TABLE IF NOT EXISTS labels (
    board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    id TEXT NOT NULL,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    "group" TEXT DEFAULT '',
    PRIMARY KEY (board_id, id)
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY,
    board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    column_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT NOT NULL,
    due_date TEXT,
    "order" INTEGER NOT NULL,
    creation_date TIMESTAMP WITH TIME ZONE NOT NULL,
    change_date TIMESTAMP WITH TIME ZONE NOT NULL,
    done_date TIMESTAMP WITH TIME ZONE,
    FOREIGN KEY (board_id, column_id) REFERENCES columns(board_id, id) ON DELETE CASCADE
);

-- Task Labels join table
CREATE TABLE IF NOT EXISTS task_labels (
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    label_id TEXT NOT NULL,
    board_id UUID NOT NULL,
    FOREIGN KEY (board_id, label_id) REFERENCES labels(board_id, id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, label_id)
);

-- Column History
CREATE TABLE IF NOT EXISTS column_history (
    id SERIAL PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    column_id TEXT NOT NULL,
    at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
    board_id UUID PRIMARY KEY REFERENCES boards(id) ON DELETE CASCADE,
    show_priority BOOLEAN DEFAULT TRUE,
    show_due_date BOOLEAN DEFAULT TRUE,
    show_age BOOLEAN DEFAULT TRUE,
    show_change_date BOOLEAN DEFAULT TRUE,
    locale TEXT NOT NULL,
    default_priority TEXT NOT NULL,
    notification_days INTEGER DEFAULT 3
);
