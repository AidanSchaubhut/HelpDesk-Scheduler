package main

import (
	"bufio"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	"helpdesk-scheduler/database"
)

// loadEnv reads a .env file and sets any variables not already in the environment.
func loadEnv(path string) {
	f, err := os.Open(path)
	if err != nil {
		return // no .env file is fine
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		key, val, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}
		key = strings.TrimSpace(key)
		val = strings.TrimSpace(val)
		// Remove surrounding quotes if present
		if len(val) >= 2 && ((val[0] == '"' && val[len(val)-1] == '"') || (val[0] == '\'' && val[len(val)-1] == '\'')) {
			val = val[1 : len(val)-1]
		}
		// Don't override existing env vars
		if os.Getenv(key) == "" {
			os.Setenv(key, val)
		}
	}
}

func main() {
	loadEnv(".env")

	database.InitDB("helpdesk.db")
	defer database.DB.Close()

	r := RegisterRoutes()

	// Serve frontend static files from ./dist (production build)
	// For any non-/api route, serve the file if it exists, otherwise serve index.html (SPA fallback)
	distDir := "./dist"
	if _, err := os.Stat(distDir); err == nil {
		fs := http.FileServer(http.Dir(distDir))
		r.NotFound(func(w http.ResponseWriter, req *http.Request) {
			// Try to serve the file directly (JS, CSS, images, etc.)
			path := distDir + req.URL.Path
			if _, err := os.Stat(path); err == nil {
				fs.ServeHTTP(w, req)
				return
			}
			// SPA fallback: serve index.html for all other routes
			http.ServeFile(w, req, distDir+"/index.html")
		})
		fmt.Println("Serving frontend from ./dist")
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "80"
	}
	addr := "0.0.0.0:" + port
	fmt.Printf("Server running on http://%s\n", addr)
	log.Fatal(http.ListenAndServe(addr, r))
}
