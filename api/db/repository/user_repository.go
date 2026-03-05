package repository

import (
	"context"
	"database/sql"
	"time"

	"github.com/google/uuid"
	"github.com/mdiener21/personal-kanban/api/db"
	"github.com/mdiener21/personal-kanban/api/models"
)

func GetOrCreateUser(ctx context.Context, email, name, provider, providerID string) (*models.User, error) {
	var user models.User
	err := db.DB.QueryRowContext(ctx,
		"SELECT id, email, name, provider, provider_id, is_verified, created_at FROM users WHERE provider = ? AND provider_id = ?",
		provider, providerID).Scan(&user.ID, &user.Email, &user.Name, &user.Provider, &user.ProviderID, &user.IsVerified, &user.CreatedAt)

	if err == sql.ErrNoRows {
		userID := uuid.New()
		_, err = db.DB.ExecContext(ctx,
			"INSERT INTO users (id, email, name, provider, provider_id, is_verified) VALUES (?, ?, ?, ?, ?, true)",
			userID, email, name, provider, providerID)
		if err != nil {
			return nil, err
		}
		return GetUserByID(ctx, userID)
	}

	if err != nil {
		return nil, err
	}

	return &user, nil
}

func CreateEmailUser(ctx context.Context, email, passwordHash, name, token string, expires time.Time) (*models.User, error) {
	userID := uuid.New()
	_, err := db.DB.ExecContext(ctx,
		"INSERT INTO users (id, email, password_hash, name, verification_token, verification_token_expires_at) VALUES (?, ?, ?, ?, ?, ?)",
		userID, email, passwordHash, name, token, expires)
	if err != nil {
		return nil, err
	}
	return GetUserByID(ctx, userID)
}

func GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	var user models.User
	err := db.DB.QueryRowContext(ctx,
		"SELECT id, email, name, password_hash, is_verified, created_at FROM users WHERE email = ?",
		email).Scan(&user.ID, &user.Email, &user.Name, &user.PasswordHash, &user.IsVerified, &user.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func VerifyUserEmail(ctx context.Context, token string) (*models.User, error) {
	// First get user to ensure it exists and return it after update
	user, err := GetUserByToken(ctx, token)
	if err != nil {
		return nil, err
	}

	_, err = db.DB.ExecContext(ctx,
		"UPDATE users SET is_verified = true, verification_token = NULL, verification_token_expires_at = NULL WHERE verification_token = ? AND verification_token_expires_at > datetime('now')",
		token)
	if err != nil {
		return nil, err
	}

	user.IsVerified = true
	return user, nil
}

func GetUserByToken(ctx context.Context, token string) (*models.User, error) {
	var user models.User
	err := db.DB.QueryRowContext(ctx,
		"SELECT id, email, name, is_verified, created_at FROM users WHERE verification_token = ?",
		token).Scan(&user.ID, &user.Email, &user.Name, &user.IsVerified, &user.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func GetUserByID(ctx context.Context, id uuid.UUID) (*models.User, error) {
	var user models.User
	err := db.DB.QueryRowContext(ctx,
		"SELECT id, email, name, provider, provider_id, is_verified, created_at FROM users WHERE id = ?",
		id).Scan(&user.ID, &user.Email, &user.Name, &user.Provider, &user.ProviderID, &user.IsVerified, &user.CreatedAt)

	if err != nil {
		return nil, err
	}

	return &user, nil
}
