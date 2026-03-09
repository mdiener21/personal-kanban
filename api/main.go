package main

import (
	"log"

	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/plugins/jsvm"
)

func main() {
	app := pocketbase.New()

	// enable js vm
	jsvm.MustRegister(app, jsvm.Config{})

	// ---------------------------------------------------------------
	// Bootstrap collections
	// ---------------------------------------------------------------
	app.OnServe().BindFunc(func(e *core.ServeEvent) error {
		// Check if it already exists
		exists, _ := app.FindCollectionByNameOrId("boards")
		if exists != nil {
			return e.Next()
		}

		collection := core.NewCollection("boards", core.CollectionTypeBase)

		rule1 := "@request.auth.id != \"\" && owner = @request.auth.id"
		rule2 := "@request.auth.id != \"\""

		collection.ListRule = &rule1
		collection.ViewRule = &rule1
		collection.CreateRule = &rule2
		collection.UpdateRule = &rule1
		collection.DeleteRule = &rule1

		collection.Fields.Add(&core.RelationField{
			Name:         "owner",
			Required:     true,
			MaxSelect:    1,
			CollectionId: "_pb_users_auth_",
		})

		collection.Fields.Add(&core.TextField{
			Name:     "name",
			Required: true,
		})

		collection.Fields.Add(&core.JSONField{
			Name:     "data",
			Required: true,
		})

		if err := app.Save(collection); err != nil {
			log.Printf("Failed to create boards collection: %v", err)
			return e.Next()
		}
		log.Println("Created 'boards' collection")

		return e.Next()
	})

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}
