package migrations

import (
	"github.com/pocketbase/pocketbase/core"
)

func init() {
	core.AppMigrations.Register(func(app core.App) error {
		// Remove the old denormalized boards collection if it exists
		// (from the previous OnServe bootstrap approach)
		if old, _ := app.FindCollectionByNameOrId("boards"); old != nil {
			if err := app.Delete(old); err != nil {
				return err
			}
		}

		ownerRule := "@request.auth.id != \"\" && owner = @request.auth.id"
		authRule := "@request.auth.id != \"\""

		// ---------------------------------------------------------------
		// 1. Boards collection
		// ---------------------------------------------------------------
		boards := core.NewCollection(core.CollectionTypeBase, "boards")

		boards.ListRule = &ownerRule
		boards.ViewRule = &ownerRule
		boards.CreateRule = &authRule
		boards.UpdateRule = &ownerRule
		boards.DeleteRule = &ownerRule

		boards.Fields.Add(&core.RelationField{
			Name:         "owner",
			Required:     true,
			MaxSelect:    1,
			CollectionId: "_pb_users_auth_",
		})
		boards.Fields.Add(&core.TextField{
			Name:     "name",
			Required: true,
		})
		boards.Fields.Add(&core.TextField{
			Name:     "local_id",
			Required: true,
		})
		boards.Fields.Add(&core.JSONField{
			Name:     "settings",
			Required: false,
		})
		boards.Fields.Add(&core.TextField{
			Name:     "created_at",
			Required: false,
		})

		if err := app.Save(boards); err != nil {
			return err
		}

		// ---------------------------------------------------------------
		// 2. Columns collection
		// ---------------------------------------------------------------
		columns := core.NewCollection(core.CollectionTypeBase, "columns")

		columns.ListRule = &ownerRule
		columns.ViewRule = &ownerRule
		columns.CreateRule = &authRule
		columns.UpdateRule = &ownerRule
		columns.DeleteRule = &ownerRule

		columns.Fields.Add(&core.RelationField{
			Name:         "owner",
			Required:     true,
			MaxSelect:    1,
			CollectionId: "_pb_users_auth_",
		})
		columns.Fields.Add(&core.RelationField{
			Name:          "board",
			Required:      true,
			MaxSelect:     1,
			CollectionId:  boards.Id,
			CascadeDelete: true,
		})
		columns.Fields.Add(&core.TextField{
			Name:     "local_id",
			Required: true,
		})
		columns.Fields.Add(&core.TextField{
			Name:     "name",
			Required: true,
		})
		columns.Fields.Add(&core.TextField{
			Name:     "color",
			Required: false,
		})
		columns.Fields.Add(&core.NumberField{
			Name:     "order",
			Required: false,
		})
		columns.Fields.Add(&core.BoolField{
			Name:     "collapsed",
			Required: false,
		})

		if err := app.Save(columns); err != nil {
			return err
		}

		// ---------------------------------------------------------------
		// 3. Labels collection
		// ---------------------------------------------------------------
		labels := core.NewCollection(core.CollectionTypeBase, "labels")

		labels.ListRule = &ownerRule
		labels.ViewRule = &ownerRule
		labels.CreateRule = &authRule
		labels.UpdateRule = &ownerRule
		labels.DeleteRule = &ownerRule

		labels.Fields.Add(&core.RelationField{
			Name:         "owner",
			Required:     true,
			MaxSelect:    1,
			CollectionId: "_pb_users_auth_",
		})
		labels.Fields.Add(&core.RelationField{
			Name:          "board",
			Required:      true,
			MaxSelect:     1,
			CollectionId:  boards.Id,
			CascadeDelete: true,
		})
		labels.Fields.Add(&core.TextField{
			Name:     "local_id",
			Required: true,
		})
		labels.Fields.Add(&core.TextField{
			Name:     "name",
			Required: true,
		})
		labels.Fields.Add(&core.TextField{
			Name:     "color",
			Required: false,
		})
		labels.Fields.Add(&core.TextField{
			Name:     "group",
			Required: false,
		})

		if err := app.Save(labels); err != nil {
			return err
		}

		// ---------------------------------------------------------------
		// 4. Tasks collection
		// ---------------------------------------------------------------
		tasks := core.NewCollection(core.CollectionTypeBase, "tasks")

		tasks.ListRule = &ownerRule
		tasks.ViewRule = &ownerRule
		tasks.CreateRule = &authRule
		tasks.UpdateRule = &ownerRule
		tasks.DeleteRule = &ownerRule

		tasks.Fields.Add(&core.RelationField{
			Name:         "owner",
			Required:     true,
			MaxSelect:    1,
			CollectionId: "_pb_users_auth_",
		})
		tasks.Fields.Add(&core.RelationField{
			Name:          "board",
			Required:      true,
			MaxSelect:     1,
			CollectionId:  boards.Id,
			CascadeDelete: true,
		})
		tasks.Fields.Add(&core.TextField{
			Name:     "local_id",
			Required: true,
		})
		tasks.Fields.Add(&core.TextField{
			Name:     "title",
			Required: true,
		})
		tasks.Fields.Add(&core.TextField{
			Name:     "description",
			Required: false,
		})
		tasks.Fields.Add(&core.SelectField{
			Name:      "priority",
			Required:  false,
			MaxSelect: 1,
			Values:    []string{"urgent", "high", "medium", "low", "none"},
		})
		tasks.Fields.Add(&core.TextField{
			Name:     "due_date",
			Required: false,
		})
		tasks.Fields.Add(&core.RelationField{
			Name:         "column",
			Required:     true,
			MaxSelect:    1,
			CollectionId: columns.Id,
		})
		tasks.Fields.Add(&core.NumberField{
			Name:     "order",
			Required: false,
		})
		tasks.Fields.Add(&core.RelationField{
			Name:         "labels",
			Required:     false,
			MaxSelect:    0, // unlimited
			CollectionId: labels.Id,
		})
		tasks.Fields.Add(&core.TextField{
			Name:     "creation_date",
			Required: false,
		})
		tasks.Fields.Add(&core.TextField{
			Name:     "change_date",
			Required: false,
		})
		tasks.Fields.Add(&core.TextField{
			Name:     "done_date",
			Required: false,
		})
		tasks.Fields.Add(&core.JSONField{
			Name:     "column_history",
			Required: false,
		})

		if err := app.Save(tasks); err != nil {
			return err
		}

		return nil
	}, func(app core.App) error {
		// Down: delete in reverse dependency order
		collections := []string{"tasks", "labels", "columns", "boards"}
		for _, name := range collections {
			col, err := app.FindCollectionByNameOrId(name)
			if err != nil {
				continue
			}
			if err := app.Delete(col); err != nil {
				return err
			}
		}
		return nil
	})
}
