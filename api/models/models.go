package models

import (
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID         uuid.UUID `json:"id"`
	Email      string    `json:"email"`
	Name       string    `json:"name"`
	Provider   string    `json:"provider"`
	ProviderID string    `json:"provider_id"`
	CreatedAt  time.Time `json:"created_at"`
}

type Board struct {
	ID        uuid.UUID `json:"id"`
	UserID    uuid.UUID `json:"user_id"`
	Name      string    `json:"name"`
	CreatedAt time.Time `json:"created_at"`
	Columns   []Column  `json:"columns,omitempty"`
	Tasks     []Task    `json:"tasks,omitempty"`
	Labels    []Label   `json:"labels,omitempty"`
	Settings  *Settings `json:"settings,omitempty"`
}

type Column struct {
	ID        string    `json:"id"`
	BoardID   uuid.UUID `json:"board_id"`
	Name      string    `json:"name"`
	Color     string    `json:"color"`
	Collapsed bool      `json:"collapsed"`
	Order     int       `json:"order"`
}

type Label struct {
	ID      string    `json:"id"`
	BoardID uuid.UUID `json:"board_id"`
	Name    string    `json:"name"`
	Color   string    `json:"color"`
	Group   string    `json:"group"`
}

type Task struct {
	ID           uuid.UUID       `json:"id"`
	BoardID      uuid.UUID       `json:"board_id"`
	ColumnID     string          `json:"column_id"`
	Title        string          `json:"title"`
	Description  string          `json:"description"`
	Priority     string          `json:"priority"`
	DueDate      string          `json:"due_date"`
	Order        int             `json:"order"`
	CreationDate time.Time       `json:"creation_date"`
	ChangeDate   time.Time       `json:"change_date"`
	DoneDate     *time.Time      `json:"done_date,omitempty"`
	Labels       []string        `json:"labels"` // IDs of labels
	History      []ColumnHistory `json:"columnHistory"`
}

type ColumnHistory struct {
	ColumnID string    `json:"column"`
	At       time.Time `json:"at"`
}

type Settings struct {
	BoardID          uuid.UUID `json:"board_id"`
	ShowPriority     bool      `json:"showPriority"`
	ShowDueDate      bool      `json:"showDueDate"`
	ShowAge          bool      `json:"showAge"`
	ShowChangeDate   bool      `json:"showChangeDate"`
	Locale           string    `json:"locale"`
	DefaultPriority  string    `json:"defaultPriority"`
	NotificationDays int       `json:"notificationDays"`
}

type SyncPayload struct {
	Boards []Board `json:"boards"`
}
