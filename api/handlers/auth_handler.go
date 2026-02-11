package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"

	"github.com/go-chi/chi/v5"
	"github.com/mdiener21/personal-kanban/api/auth"
	"github.com/mdiener21/personal-kanban/api/db/repository"
	"github.com/markbates/goth"
	"github.com/markbates/goth/gothic"
)

// SetProvider middleware to put the provider into the request context for gothic
func SetProvider(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		provider := chi.URLParam(r, "provider")
		if provider != "" {
			q := r.URL.Query()
			q.Set("provider", provider)
			r.URL.RawQuery = q.Encode()
		}
		next.ServeHTTP(w, r)
	})
}

func AuthLogin(w http.ResponseWriter, r *http.Request) {
	if user, err := gothic.CompleteUserAuth(w, r); err == nil {
		handleSuccessfulLogin(w, r, user)
		return
	}
	gothic.BeginAuthHandler(w, r)
}

func AuthCallback(w http.ResponseWriter, r *http.Request) {
	user, err := gothic.CompleteUserAuth(w, r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	handleSuccessfulLogin(w, r, user)
}

func handleSuccessfulLogin(w http.ResponseWriter, r *http.Request, user goth.User) {
	dbUser, err := repository.GetOrCreateUser(r.Context(), user.Email, user.Name, user.Provider, user.UserID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	token, err := auth.GenerateToken(dbUser.ID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:3000"
	}

	http.Redirect(w, r, fmt.Sprintf("%s?token=%s", frontendURL, token), http.StatusFound)
}

func GetMe(w http.ResponseWriter, r *http.Request) {
	userID, err := auth.GetUserIDFromRequest(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	user, err := repository.GetUserByID(r.Context(), userID)
	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	json.NewEncoder(w).Encode(user)
}
