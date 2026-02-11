package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/mdiener21/personal-kanban/api/db"
	"github.com/mdiener21/personal-kanban/api/models"
)

func GetOrCreateUser(ctx context.Context, email, name, provider, providerID string) (*models.User, error) {
	var user models.User
	err := db.Pool.QueryRow(ctx,
		"SELECT id, email, name, provider, provider_id, created_at FROM users WHERE provider = $1 AND provider_id = $2",
		provider, providerID).Scan(&user.ID, &user.Email, &user.Name, &user.Provider, &user.ProviderID, &user.CreatedAt)

	if err == pgx.ErrNoRows {
		err = db.Pool.QueryRow(ctx,
			"INSERT INTO users (email, name, provider, provider_id) VALUES ($1, $2, $3, $4) RETURNING id, email, name, provider, provider_id, created_at",
			email, name, provider, providerID).Scan(&user.ID, &user.Email, &user.Name, &user.Provider, &user.ProviderID, &user.CreatedAt)
	}

	if err != nil {
		return nil, err
	}

	return &user, nil
}

func GetUserByID(ctx context.Context, id uuid.UUID) (*models.User, error) {
	var user models.User
	err := db.Pool.QueryRow(ctx,
		"SELECT id, email, name, provider, provider_id, created_at FROM users WHERE id = $1",
		id).Scan(&user.ID, &user.Email, &user.Name, &user.Provider, &user.ProviderID, &user.CreatedAt)

	if err != nil {
		return nil, err
	}

	return &user, nil
}
