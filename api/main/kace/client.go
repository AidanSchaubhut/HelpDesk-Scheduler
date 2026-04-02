package kace

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/http/cookiejar"
	"os"
	"strings"
	"sync"
	"time"
)

// KACETicket represents a single ticket from the KACE API response.
type KACETicket struct {
	ID    int `json:"id"`
	Owner struct {
		UserName string `json:"user_name"`
	} `json:"owner"`
}

// KACEResponse represents the top-level KACE API response.
type KACEResponse struct {
	Tickets []KACETicket `json:"Tickets"`
}

// session holds a reusable authenticated KACE session.
type session struct {
	client    *http.Client
	authToken string // x-kace-authorization value
	createdAt time.Time
}

var (
	// session cache (reuse login across requests)
	sessMu  sync.Mutex
	sess    *session
	sessTTL = 10 * time.Minute
)

func getHost() string {
	return strings.TrimRight(os.Getenv("KACE_HOST"), "/")
}

// authenticate logs into KACE and returns a session with cookies and the auth token.
// Sessions are cached and reused for sessTTL.
func authenticate() (*session, error) {
	sessMu.Lock()
	defer sessMu.Unlock()

	if sess != nil && time.Since(sess.createdAt) < sessTTL {
		return sess, nil
	}

	host := getHost()
	username := os.Getenv("KACE_USERNAME")
	password := os.Getenv("KACE_PASSWORD")

	if host == "" || username == "" || password == "" {
		return nil, fmt.Errorf("KACE_HOST, KACE_USERNAME, and KACE_PASSWORD must be set")
	}

	// Build login request
	loginBody, _ := json.Marshal(map[string]string{
		"userName":         username,
		"password":         password,
		"organizationName": "Louisiana Tech University",
	})

	jar, _ := cookiejar.New(nil)
	client := &http.Client{
		Timeout: 15 * time.Second,
		Jar:     jar,
	}

	loginURL := host + "/ams/shared/api/security/login"
	req, err := http.NewRequest("POST", loginURL, bytes.NewReader(loginBody))
	if err != nil {
		return nil, fmt.Errorf("kace login request build failed: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("x-kace-api-version", "8")

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("kace login request failed: %w", err)
	}
	defer resp.Body.Close()

	authToken := resp.Header.Get("x-kace-authorization")
	if authToken == "" {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("kace login failed (no x-kace-authorization header): status %d, body: %s", resp.StatusCode, string(body))
	}

	log.Printf("KACE: authenticated successfully")

	sess = &session{
		client:    client,
		authToken: authToken,
		createdAt: time.Now(),
	}
	return sess, nil
}

// clearSession forces re-authentication on the next request.
func clearSession() {
	sessMu.Lock()
	sess = nil
	sessMu.Unlock()
}

// FetchTicketCount fetches the open ticket count for a single KACE username.
// Returns the count of non-closed tickets in queue 3 owned by the given username.
func FetchTicketCount(username string) (int, error) {
	host := getHost()
	if host == "" {
		return 0, nil
	}

	s, err := authenticate()
	if err != nil {
		return 0, fmt.Errorf("kace auth failed: %w", err)
	}

	count, err := fetchTicketCountWithSession(s, host, username)
	if err != nil && strings.Contains(err.Error(), "401") {
		// Session expired, retry with fresh auth
		clearSession()
		s, err = authenticate()
		if err != nil {
			return 0, fmt.Errorf("kace re-auth failed: %w", err)
		}
		count, err = fetchTicketCountWithSession(s, host, username)
	}
	return count, err
}

func fetchTicketCountWithSession(s *session, host, username string) (int, error) {
	baseURL := fmt.Sprintf("%s/api/service_desk/tickets", host)

	filtering := fmt.Sprintf("hd_queue_id eq 3,status.state neq closed,owner.user_name eq %s", username)
	shaping := "hd_ticket all,owner limited,submitter limited"
	paging := "limit 1000"

	encodeSpaces := func(s string) string {
		return strings.ReplaceAll(s, " ", "%20")
	}

	rawQuery := fmt.Sprintf("filtering=%s&shaping=%s&paging=%s",
		encodeSpaces(filtering),
		encodeSpaces(shaping),
		encodeSpaces(paging),
	)

	req, err := http.NewRequest("GET", baseURL, nil)
	if err != nil {
		return 0, fmt.Errorf("kace request build failed: %w", err)
	}
	req.URL.RawQuery = rawQuery

	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-kace-api-version", "8")
	req.Header.Set("x-kace-authorization", s.authToken)

	resp, err := s.client.Do(req)
	if err != nil {
		return 0, fmt.Errorf("kace request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusUnauthorized {
		return 0, fmt.Errorf("kace returned 401")
	}

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return 0, fmt.Errorf("kace returned status %d: %s", resp.StatusCode, string(body))
	}

	var kaceResp KACEResponse
	if err := json.NewDecoder(resp.Body).Decode(&kaceResp); err != nil {
		return 0, fmt.Errorf("kace response parse failed: %w", err)
	}

	return len(kaceResp.Tickets), nil
}
