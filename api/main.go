package main

import (
	"log"

	"github.com/pocketbase/pocketbase"

	_ "github.com/mdiener21/personal-kanban/api/migrations"
)

func main() {
	app := pocketbase.New()

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}
