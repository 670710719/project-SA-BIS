package router

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type database struct {
	pool *pgxpool.Pool
}

func newDatabase(ctx context.Context) (*database, error) {
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		return nil, nil
	}

	config, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("parse DATABASE_URL: %w", err)
	}
	config.MaxConns = 4
	config.MinConns = 0
	config.MaxConnLifetime = 30 * time.Minute

	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		return nil, fmt.Errorf("create database pool: %w", err)
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("connect to database: %w", err)
	}

	db := &database{pool: pool}
	if err := db.migrate(ctx); err != nil {
		pool.Close()
		return nil, err
	}
	return db, nil
}

func (db *database) migrate(ctx context.Context) error {
	_, err := db.pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS employees (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			department TEXT NOT NULL,
			position TEXT NOT NULL,
			email TEXT NOT NULL DEFAULT '',
			phone TEXT NOT NULL DEFAULT '',
			account_username TEXT NOT NULL DEFAULT '',
			salary DOUBLE PRECISION NOT NULL DEFAULT 0,
			grade TEXT NOT NULL DEFAULT '',
			adjustment_percent DOUBLE PRECISION NOT NULL DEFAULT 0,
			evaluation_status TEXT NOT NULL DEFAULT 'รอประเมิน'
		);
		CREATE TABLE IF NOT EXISTS accounts (
			username TEXT PRIMARY KEY,
			password TEXT NOT NULL,
			role TEXT NOT NULL
		);
		CREATE TABLE IF NOT EXISTS assessments (
			id TEXT PRIMARY KEY,
			employee_id TEXT NOT NULL,
			employee TEXT NOT NULL,
			manager TEXT NOT NULL DEFAULT '',
			year TEXT NOT NULL,
			submitted_at TEXT NOT NULL DEFAULT '',
			status TEXT NOT NULL DEFAULT '',
			assessment_type TEXT NOT NULL DEFAULT '',
			assessment JSONB NOT NULL DEFAULT '{}'::jsonb,
			hr_final_score DOUBLE PRECISION,
			hr_grade TEXT NOT NULL DEFAULT '',
			hr_feedback TEXT NOT NULL DEFAULT '',
			hr_reviewed_at TEXT NOT NULL DEFAULT ''
		);
	`)
	if err != nil {
		return fmt.Errorf("migrate database: %w", err)
	}
	return nil
}

func (db *database) seed(ctx context.Context, employees []Employee, accounts map[string]Account) error {
	var count int
	if err := db.pool.QueryRow(ctx, `SELECT COUNT(*) FROM employees`).Scan(&count); err != nil {
		return fmt.Errorf("count employees: %w", err)
	}
	if count == 0 {
		for _, employee := range employees {
			if _, err := db.pool.Exec(ctx, `
				INSERT INTO employees
					(id, name, department, position, email, phone, account_username, salary, grade, adjustment_percent, evaluation_status)
				VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
				ON CONFLICT (id) DO NOTHING
			`, employee.ID, employee.Name, employee.Department, employee.Position, employee.Email, employee.Phone,
				employee.AccountUsername, employee.Salary, employee.Grade, employee.AdjustmentPercent, employee.EvaluationStatus); err != nil {
				return fmt.Errorf("seed employee %s: %w", employee.ID, err)
			}
		}
	}

	var accountCount int
	if err := db.pool.QueryRow(ctx, `SELECT COUNT(*) FROM accounts`).Scan(&accountCount); err != nil {
		return fmt.Errorf("count accounts: %w", err)
	}
	if accountCount == 0 {
		for username, account := range accounts {
			if _, err := db.pool.Exec(ctx, `
				INSERT INTO accounts (username, password, role) VALUES ($1,$2,$3)
				ON CONFLICT (username) DO NOTHING
			`, username, account.Password, account.Role); err != nil {
				return fmt.Errorf("seed account %s: %w", username, err)
			}
		}
	}
	return nil
}

func (db *database) loadEmployees(ctx context.Context) ([]Employee, error) {
	rows, err := db.pool.Query(ctx, `
		SELECT id, name, department, position, email, phone, account_username, salary, grade, adjustment_percent, evaluation_status
		FROM employees ORDER BY id
	`)
	if err != nil {
		return nil, fmt.Errorf("load employees: %w", err)
	}
	defer rows.Close()

	result := make([]Employee, 0)
	for rows.Next() {
		var employee Employee
		if err := rows.Scan(&employee.ID, &employee.Name, &employee.Department, &employee.Position, &employee.Email,
			&employee.Phone, &employee.AccountUsername, &employee.Salary, &employee.Grade,
			&employee.AdjustmentPercent, &employee.EvaluationStatus); err != nil {
			return nil, fmt.Errorf("scan employee: %w", err)
		}
		result = append(result, employee)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate employees: %w", err)
	}
	return result, nil
}

func (db *database) loadAccounts(ctx context.Context) (map[string]Account, error) {
	rows, err := db.pool.Query(ctx, `SELECT username, password, role FROM accounts`)
	if err != nil {
		return nil, fmt.Errorf("load accounts: %w", err)
	}
	defer rows.Close()

	result := make(map[string]Account)
	for rows.Next() {
		var username string
		var account Account
		if err := rows.Scan(&username, &account.Password, &account.Role); err != nil {
			return nil, fmt.Errorf("scan account: %w", err)
		}
		result[username] = account
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate accounts: %w", err)
	}
	return result, nil
}

func (db *database) loadAssessments(ctx context.Context) (map[string]AssessmentSubmission, error) {
	rows, err := db.pool.Query(ctx, `
		SELECT id, employee_id, employee, manager, year, submitted_at, status, assessment_type, assessment,
			hr_final_score, hr_grade, hr_feedback, hr_reviewed_at
		FROM assessments
	`)
	if err != nil {
		return nil, fmt.Errorf("load assessments: %w", err)
	}
	defer rows.Close()

	result := make(map[string]AssessmentSubmission)
	for rows.Next() {
		var submission AssessmentSubmission
		var assessment []byte
		if err := rows.Scan(&submission.ID, &submission.EmployeeID, &submission.Employee, &submission.Manager,
			&submission.Year, &submission.SubmittedAt, &submission.Status, &submission.AssessmentType,
			&assessment, &submission.HRFinalScore, &submission.HRGrade, &submission.HRFeedback, &submission.HRReviewedAt); err != nil {
			return nil, fmt.Errorf("scan assessment: %w", err)
		}
		if err := json.Unmarshal(assessment, &submission.Assessment); err != nil {
			return nil, fmt.Errorf("decode assessment %s: %w", submission.ID, err)
		}
		result[submission.ID] = submission
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate assessments: %w", err)
	}
	return result, nil
}

func (db *database) saveEmployee(ctx context.Context, employee Employee) error {
	_, err := db.pool.Exec(ctx, `
		INSERT INTO employees
			(id, name, department, position, email, phone, account_username, salary, grade, adjustment_percent, evaluation_status)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
		ON CONFLICT (id) DO UPDATE SET name=$2, department=$3, position=$4, email=$5, phone=$6,
			account_username=$7, salary=$8, grade=$9, adjustment_percent=$10, evaluation_status=$11
	`, employee.ID, employee.Name, employee.Department, employee.Position, employee.Email, employee.Phone,
		employee.AccountUsername, employee.Salary, employee.Grade, employee.AdjustmentPercent, employee.EvaluationStatus)
	return err
}

func (db *database) saveAccount(ctx context.Context, username string, account Account) error {
	_, err := db.pool.Exec(ctx, `
		INSERT INTO accounts (username, password, role) VALUES ($1,$2,$3)
		ON CONFLICT (username) DO UPDATE SET password=$2, role=$3
	`, username, account.Password, account.Role)
	return err
}

func (db *database) saveAssessment(ctx context.Context, submission AssessmentSubmission) error {
	assessment, err := json.Marshal(submission.Assessment)
	if err != nil {
		return fmt.Errorf("encode assessment %s: %w", submission.ID, err)
	}
	_, err = db.pool.Exec(ctx, `
		INSERT INTO assessments
			(id, employee_id, employee, manager, year, submitted_at, status, assessment_type, assessment,
				hr_final_score, hr_grade, hr_feedback, hr_reviewed_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12,$13)
		ON CONFLICT (id) DO UPDATE SET employee_id=$2, employee=$3, manager=$4, year=$5, submitted_at=$6,
			status=$7, assessment_type=$8, assessment=$9::jsonb, hr_final_score=$10, hr_grade=$11,
			hr_feedback=$12, hr_reviewed_at=$13
	`, submission.ID, submission.EmployeeID, submission.Employee, submission.Manager, submission.Year,
		submission.SubmittedAt, submission.Status, submission.AssessmentType, string(assessment), submission.HRFinalScore,
		submission.HRGrade, submission.HRFeedback, submission.HRReviewedAt)
	return err
}

func (db *database) deleteEmployee(ctx context.Context, id, username string) error {
	_, err := db.pool.Exec(ctx, `DELETE FROM employees WHERE id=$1`, id)
	if err != nil {
		return err
	}
	_, err = db.pool.Exec(ctx, `DELETE FROM accounts WHERE username=$1 OR username=$2`, id, username)
	return err
}

func (db *database) deleteAssessmentsForEmployee(ctx context.Context, id string) error {
	_, err := db.pool.Exec(ctx, `DELETE FROM assessments WHERE employee_id=$1`, id)
	return err
}
