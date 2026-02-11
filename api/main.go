package main

import (
	"log"
	"net/http"
	"os"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/gorilla/sessions"
	"github.com/joho/godotenv"
	"github.com/mdiener21/personal-kanban/api/db"
	"github.com/mdiener21/personal-kanban/api/handlers"
	"github.com/markbates/goth/gothic"
)

func main() {
	godotenv.Load()

	// Configure session store for gothic
	key := os.Getenv("SESSION_SECRET")
	if key == "" {
		key = "secret-session-key"
	}
	store := sessions.NewCookieStore([]byte(key))
	store.MaxAge(86400 * 30) // 30 days
	store.Options.Path = "/"
	store.Options.HttpOnly = true
	store.Options.Secure = os.Getenv("NODE_ENV") == "production"
	gothic.Store = store

	if err := db.Connect(); err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	r := chi.NewRouter()

	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"}, // Adjust in production
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	r.Route("/auth", func(r chi.Router) {
		r.Group(func(r chi.Router) {
			r.Use(handlers.SetProvider)
			r.Get("/{provider}/login", handlers.AuthLogin)
			r.Get("/{provider}/callback", handlers.AuthCallback)
		})
		r.Get("/me", handlers.GetMe)
	})

	r.Route("/api", func(r chi.Router) {
		r.Get("/boards", handlers.GetBoards)
		r.Get("/boards/{id}", handlers.GetFullBoard)
		r.Post("/sync", handlers.Sync)
		r.Delete("/boards/{id}", handlers.DeleteBoard)
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatal(err)
	}
}
