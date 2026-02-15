package mailer

import (
	"fmt"
	"net/smtp"
	"os"
)

type Mailer struct {
	host     string
	port     string
	username string
	password string
	from     string
}

func New() *Mailer {
	return &Mailer{
		host:     os.Getenv("SMTP_HOST"),
		port:     os.Getenv("SMTP_PORT"),
		username: os.Getenv("SMTP_USERNAME"),
		password: os.Getenv("SMTP_PASSWORD"),
		from:     os.Getenv("SMTP_FROM"),
	}
}

func (m *Mailer) SendVerificationEmail(to, name, token string) error {
	if m.host == "" {
		fmt.Printf("SMTP not configured. Verification token for %s: %s\n", to, token)
		return nil
	}

	appURL := os.Getenv("FRONTEND_URL")
	if appURL == "" {
		appURL = "http://localhost:3000"
	}
	apiURL := os.Getenv("AUTH_CALLBACK_URL")
	if apiURL == "" {
		apiURL = "http://localhost:8080/auth"
	}

	verificationLink := fmt.Sprintf("%s/verify?token=%s", apiURL, token)

	subject := "Verify your Personal Kanban account"
	body := fmt.Sprintf("Hi %s,\n\nPlease verify your email by clicking the link below:\n\n%s\n\nIf you didn't create an account, you can ignore this email.", name, verificationLink)

	message := fmt.Sprintf("From: %s\r\n"+
		"To: %s\r\n"+
		"Subject: %s\r\n"+
		"\r\n"+
		"%s\r\n", m.from, to, subject, body)

	auth := smtp.PlainAuth("", m.username, m.password, m.host)
	addr := fmt.Sprintf("%s:%s", m.host, m.port)

	err := smtp.SendMail(addr, auth, m.from, []string{to}, []byte(message))
	if err != nil {
		return fmt.Errorf("failed to send email: %v", err)
	}

	return nil
}
