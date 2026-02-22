package auth

import (
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/markbates/goth"
	"github.com/markbates/goth/providers/apple"
	"github.com/markbates/goth/providers/google"
	"github.com/markbates/goth/providers/microsoftonline"
)

var jwtSecret = []byte(os.Getenv("JWT_SECRET"))

func init() {
	if len(jwtSecret) == 0 {
		jwtSecret = []byte("secret")
	}

	goth.UseProviders(
		google.New(os.Getenv("GOOGLE_KEY"), os.Getenv("GOOGLE_SECRET"), os.Getenv("AUTH_CALLBACK_URL")+"/google/callback"),
		apple.New(os.Getenv("APPLE_KEY"), os.Getenv("APPLE_SECRET"), os.Getenv("AUTH_CALLBACK_URL")+"/apple/callback", nil),
		microsoftonline.New(os.Getenv("MICROSOFT_KEY"), os.Getenv("MICROSOFT_SECRET"), os.Getenv("AUTH_CALLBACK_URL")+"/microsoftonline/callback"),
	)
}

type Claims struct {
	UserID uuid.UUID `json:"user_id"`
	jwt.RegisteredClaims
}

func GenerateToken(userID uuid.UUID) (string, error) {
	expirationTime := time.Now().Add(72 * time.Hour)
	claims := &Claims{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}

func ValidateToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		return jwtSecret, nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, fmt.Errorf("invalid token")
}

func GetUserIDFromRequest(r *http.Request) (uuid.UUID, error) {
	authHeader := r.Header.Get("Authorization")
	if len(authHeader) < 8 || authHeader[:7] != "Bearer " {
		return uuid.Nil, fmt.Errorf("invalid authorization header")
	}

	tokenString := authHeader[7:]
	claims, err := ValidateToken(tokenString)
	if err != nil {
		return uuid.Nil, err
	}

	return claims.UserID, nil
}
