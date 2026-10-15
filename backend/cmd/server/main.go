package main

import (
	"log"
	"os"

	"project-sa-bis/backend/router"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	if err := router.NewRouter().Run(":" + port); err != nil {
		log.Fatal(err)
	}
}
