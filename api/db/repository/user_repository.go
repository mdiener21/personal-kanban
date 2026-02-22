package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/mdiener21/personal-kanban/api/db"
	"github.com/mdiener21/personal-kanban/api/models"
)

func GetOrCreateUser(ctx context.Context, email, name, provider, providerID string) (*models.User, error) {
	var user models.User
	err := db.Pool.QueryRow(ctx,
		"SELECT id, email, name, provider, provider_id, is_verified, created_at FROM users WHERE provider = $1 AND provider_id = $2",
		provider, providerID).Scan(&user.ID, &user.Email, &user.Name, &user.Provider, &user.ProviderID, &user.IsVerified, &user.CreatedAt)

	if err == pgx.ErrNoRows {
		err = db.Pool.QueryRow(ctx,
			"INSERT INTO users (email, name, provider, provider_id, is_verified) VALUES ($1, $2, $3, $4, true) RETURNING id, email, name, provider, provider_id, is_verified, created_at",
			email, name, provider, providerID).Scan(&user.ID, &user.Email, &user.Name, &user.Provider, &user.ProviderID, &user.IsVerified, &user.CreatedAt)
	}

	if err != nil {
		return nil, err
	}

	return &user, nil
}

func CreateEmailUser(ctx context.Context, email, passwordHash, name, token string, expires time.Time) (*models.User, error) {
	var user models.User
	err := db.Pool.QueryRow(ctx,
		"INSERT INTO users (email, password_hash, name, verification_token, verification_token_expires_at) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, name, is_verified, created_at",
		email, passwordHash, name, token, expires).Scan(&user.ID, &user.Email, &user.Name, &user.IsVerified, &user.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	var user models.User
	err := db.Pool.QueryRow(ctx,
		"SELECT id, email, name, password_hash, is_verified, created_at FROM users WHERE email = $1",
		email).Scan(&user.ID, &user.Email, &user.Name, &user.PasswordHash, &user.IsVerified, &user.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func VerifyUserEmail(ctx context.Context, token string) (*models.User, error) {
	var user models.User
	err := db.Pool.QueryRow(ctx,
		"UPDATE users SET is_verified = true, verification_token = NULL, verification_token_expires_at = NULL WHERE verification_token = $1 AND verification_token_expires_at > NOW() RETURNING id, email, name, is_verified, created_at",
		token).Scan(&user.ID, &user.Email, &user.Name, &user.IsVerified, &user.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func GetUserByID(ctx context.Context, id uuid.UUID) (*models.User, error) {
	var user models.User
	err := db.Pool.QueryRow(ctx,
		"SELECT id, email, name, provider, provider_id, is_verified, created_at FROM users WHERE id = $1",
		id).Scan(&user.ID, &user.Email, &user.Name, &user.Provider, &user.ProviderID, &user.IsVerified, &user.CreatedAt)

	if err != nil {
		return nil, err
	}

	return &user, nil
}
