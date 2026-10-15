package handler

import (
	"net/http"

	"project-sa-bis/backend/router"
)

var engine = router.NewRouter()

func Handler(w http.ResponseWriter, r *http.Request) {
	engine.ServeHTTP(w, r)
}
