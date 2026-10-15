package main

import (
	"log"

	"project-sa-bis/backend/router"
)

func main() {
	if err := router.NewRouter().Run(":8080"); err != nil {
		log.Fatal(err)
	}
}
