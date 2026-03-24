package auth

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type contextKey string

const (
	claimsCWID contextKey = "cwid"
	claimsRole contextKey = "role"
)

// JWTSecret is generated at startup — tokens invalidate on restart
var JWTSecret []byte

func init() {
	secret := make([]byte, 32)
	if _, err := rand.Read(secret); err != nil {
		panic("failed to generate JWT secret: " + err.Error())
	}
	JWTSecret = secret
}

// SetSecret allows overriding the secret (e.g., from env var for persistent tokens)
func SetSecret(s string) {
	JWTSecret, _ = hex.DecodeString(s)
}

func GenerateToken(cwid string, role string) (string, error) {
	claims := jwt.MapClaims{
		"cwid": cwid,
		"role": role,
		"exp":  time.Now().Add(8 * time.Hour).Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(JWTSecret)
}

func parseToken(tokenStr string) (jwt.MapClaims, error) {
	token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method")
		}
		return JWTSecret, nil
	})
	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}

	return claims, nil
}

// AuthMiddleware requires a valid JWT on all routes it wraps
func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		header := r.Header.Get("Authorization")
		if header == "" {
			http.Error(w, "Authorization header required", http.StatusUnauthorized)
			return
		}

		parts := strings.SplitN(header, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			http.Error(w, "Authorization header must be: Bearer <token>", http.StatusUnauthorized)
			return
		}

		claims, err := parseToken(parts[1])
		if err != nil {
			http.Error(w, "Invalid or expired token", http.StatusUnauthorized)
			return
		}

		cwid, _ := claims["cwid"].(string)
		role, _ := claims["role"].(string)

		ctx := context.WithValue(r.Context(), claimsCWID, cwid)
		ctx = context.WithValue(ctx, claimsRole, role)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// AdminOnly requires the authenticated user to have the admin role
func AdminOnly(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		role := GetRole(r)
		if role != "admin" {
			http.Error(w, "Admin access required", http.StatusForbidden)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// GetCWID returns the authenticated user's CWID from the request context
func GetCWID(r *http.Request) string {
	cwid, _ := r.Context().Value(claimsCWID).(string)
	return cwid
}

// GetRole returns the authenticated user's role from the request context
func GetRole(r *http.Request) string {
	role, _ := r.Context().Value(claimsRole).(string)
	return role
}
