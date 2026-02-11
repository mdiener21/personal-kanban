package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/mdiener21/personal-kanban/api/db"
	"github.com/mdiener21/personal-kanban/api/models"
)

func GetBoardsByUserID(ctx context.Context, userID uuid.UUID) ([]models.Board, error) {
	rows, err := db.Pool.Query(ctx, "SELECT id, name, created_at FROM boards WHERE user_id = $1", userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var boards []models.Board
	for rows.Next() {
		var b models.Board
		if err := rows.Scan(&b.ID, &b.Name, &b.CreatedAt); err != nil {
			return nil, err
		}
		b.UserID = userID
		boards = append(boards, b)
	}
	return boards, nil
}

func GetFullBoard(ctx context.Context, boardID uuid.UUID, userID uuid.UUID) (*models.Board, error) {
	var b models.Board
	err := db.Pool.QueryRow(ctx, "SELECT id, name, created_at FROM boards WHERE id = $1 AND user_id = $2", boardID, userID).
		Scan(&b.ID, &b.Name, &b.CreatedAt)
	if err != nil {
		return nil, err
	}
	b.UserID = userID

	// Load Columns
	colRows, err := db.Pool.Query(ctx, "SELECT id, name, color, collapsed, \"order\" FROM columns WHERE board_id = $1 ORDER BY \"order\"", boardID)
	if err != nil {
		return nil, err
	}
	defer colRows.Close()
	for colRows.Next() {
		var c models.Column
		if err := colRows.Scan(&c.ID, &c.Name, &c.Color, &c.Collapsed, &c.Order); err != nil {
			return nil, err
		}
		c.BoardID = boardID
		b.Columns = append(b.Columns, c)
	}

	// Load Labels
	lblRows, err := db.Pool.Query(ctx, "SELECT id, name, color, \"group\" FROM labels WHERE board_id = $1", boardID)
	if err != nil {
		return nil, err
	}
	defer lblRows.Close()
	for lblRows.Next() {
		var l models.Label
		if err := lblRows.Scan(&l.ID, &l.Name, &l.Color, &l.Group); err != nil {
			return nil, err
		}
		l.BoardID = boardID
		b.Labels = append(b.Labels, l)
	}

	// Load Tasks
	taskRows, err := db.Pool.Query(ctx, "SELECT id, column_id, title, description, priority, due_date, \"order\", creation_date, change_date, done_date FROM tasks WHERE board_id = $1 ORDER BY \"order\"", boardID)
	if err != nil {
		return nil, err
	}
	defer taskRows.Close()

	tasksMap := make(map[uuid.UUID]*models.Task)
	var taskIDs []uuid.UUID
	for taskRows.Next() {
		var t models.Task
		if err := taskRows.Scan(&t.ID, &t.ColumnID, &t.Title, &t.Description, &t.Priority, &t.DueDate, &t.Order, &t.CreationDate, &t.ChangeDate, &t.DoneDate); err != nil {
			return nil, err
		}
		t.BoardID = boardID
		t.Labels = []string{}
		t.History = []models.ColumnHistory{}
		b.Tasks = append(b.Tasks, t)
		taskIDs = append(taskIDs, t.ID)
		tasksMap[t.ID] = &b.Tasks[len(b.Tasks)-1]
	}

	if len(taskIDs) > 0 {
		// Load All Task Labels for this board
		tlRows, err := db.Pool.Query(ctx, "SELECT task_id, label_id FROM task_labels WHERE board_id = $1", boardID)
		if err != nil {
			return nil, err
		}
		defer tlRows.Close()
		for tlRows.Next() {
			var tid uuid.UUID
			var lid string
			if err := tlRows.Scan(&tid, &lid); err != nil {
				return nil, err
			}
			if t, ok := tasksMap[tid]; ok {
				t.Labels = append(t.Labels, lid)
			}
		}

		// Load All Task History for this board
		hRows, err := db.Pool.Query(ctx, "SELECT ch.task_id, ch.column_id, ch.at FROM column_history ch JOIN tasks t ON ch.task_id = t.id WHERE t.board_id = $1 ORDER BY ch.at", boardID)
		if err != nil {
			return nil, err
		}
		defer hRows.Close()
		for hRows.Next() {
			var tid uuid.UUID
			var h models.ColumnHistory
			if err := hRows.Scan(&tid, &h.ColumnID, &h.At); err != nil {
				return nil, err
			}
			if t, ok := tasksMap[tid]; ok {
				t.History = append(t.History, h)
			}
		}
	}

	// Load Settings
	var s models.Settings
	err = db.Pool.QueryRow(ctx, "SELECT show_priority, show_due_date, show_age, show_change_date, locale, default_priority, notification_days FROM settings WHERE board_id = $1", boardID).
		Scan(&s.ShowPriority, &s.ShowDueDate, &s.ShowAge, &s.ShowChangeDate, &s.Locale, &s.DefaultPriority, &s.NotificationDays)
	if err != nil && err != pgx.ErrNoRows {
		return nil, err
	}
	if err == nil {
		s.BoardID = boardID
		b.Settings = &s
	}

	return &b, nil
}

func SyncBoards(ctx context.Context, userID uuid.UUID, payload models.SyncPayload) error {
	tx, err := db.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	for _, b := range payload.Boards {
		// Check ownership if board exists
		var ownerID uuid.UUID
		err = tx.QueryRow(ctx, "SELECT user_id FROM boards WHERE id = $1", b.ID).Scan(&ownerID)
		if err != nil && err != pgx.ErrNoRows {
			return err
		}

		if err == nil && ownerID != userID {
			// Board exists but belongs to another user - Skip or return error
			// For security, it's better to return an error or skip. Let's return an error.
			return fmt.Errorf("unauthorized: you do not own board %s", b.ID)
		}

		// Upsert board
		_, err = tx.Exec(ctx, "INSERT INTO boards (id, user_id, name, created_at) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name", b.ID, userID, b.Name, b.CreatedAt)
		if err != nil {
			return err
		}

		// Delete existing board data to refresh (simple sync strategy)
		_, err = tx.Exec(ctx, "DELETE FROM columns WHERE board_id = $1", b.ID)
		if err != nil {
			return err
		}
		_, err = tx.Exec(ctx, "DELETE FROM labels WHERE board_id = $1", b.ID)
		if err != nil {
			return err
		}
		_, err = tx.Exec(ctx, "DELETE FROM tasks WHERE board_id = $1", b.ID)
		if err != nil {
			return err
		}
		_, err = tx.Exec(ctx, "DELETE FROM settings WHERE board_id = $1", b.ID)
		if err != nil {
			return err
		}

		// Insert Columns
		for _, c := range b.Columns {
			_, err = tx.Exec(ctx, "INSERT INTO columns (board_id, id, name, color, collapsed, \"order\") VALUES ($1, $2, $3, $4, $5, $6)", b.ID, c.ID, c.Name, c.Color, c.Collapsed, c.Order)
			if err != nil {
				return err
			}
		}

		// Insert Labels
		for _, l := range b.Labels {
			_, err = tx.Exec(ctx, "INSERT INTO labels (board_id, id, name, color, \"group\") VALUES ($1, $2, $3, $4, $5)", b.ID, l.ID, l.Name, l.Color, l.Group)
			if err != nil {
				return err
			}
		}

		// Insert Tasks
		for _, t := range b.Tasks {
			_, err = tx.Exec(ctx, "INSERT INTO tasks (id, board_id, column_id, title, description, priority, due_date, \"order\", creation_date, change_date, done_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)",
				t.ID, b.ID, t.ColumnID, t.Title, t.Description, t.Priority, t.DueDate, t.Order, t.CreationDate, t.ChangeDate, t.DoneDate)
			if err != nil {
				return err
			}

			// Insert Task Labels
			for _, lid := range t.Labels {
				_, err = tx.Exec(ctx, "INSERT INTO task_labels (task_id, label_id, board_id) VALUES ($1, $2, $3)", t.ID, lid, b.ID)
				if err != nil {
					return err
				}
			}

			// Insert History
			for _, h := range t.History {
				_, err = tx.Exec(ctx, "INSERT INTO column_history (task_id, column_id, at) VALUES ($1, $2, $3)", t.ID, h.ColumnID, h.At)
				if err != nil {
					return err
				}
			}
		}

		// Insert Settings
		if b.Settings != nil {
			s := b.Settings
			_, err = tx.Exec(ctx, "INSERT INTO settings (board_id, show_priority, show_due_date, show_age, show_change_date, locale, default_priority, notification_days) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
				b.ID, s.ShowPriority, s.ShowDueDate, s.ShowAge, s.ShowChangeDate, s.Locale, s.DefaultPriority, s.NotificationDays)
			if err != nil {
				return err
			}
		}
	}

	return tx.Commit(ctx)
}

func DeleteBoard(ctx context.Context, boardID uuid.UUID, userID uuid.UUID) error {
	_, err := db.Pool.Exec(ctx, "DELETE FROM boards WHERE id = $1 AND user_id = $2", boardID, userID)
	return err
}
