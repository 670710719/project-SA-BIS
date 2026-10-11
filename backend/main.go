// backend/main.go
package main

import (
	"fmt"
	"log"
	"net/http"
	"strings"
	"sync"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
	Role     string `json:"role" binding:"required"`
}

type RegisterRequest struct {
	Username        string `json:"username" binding:"required"`
	Password        string `json:"password" binding:"required"`
	ConfirmPassword string `json:"confirmPassword" binding:"required"`
}

type User struct {
	Username   string `json:"username"`
	Name       string `json:"name"`
	EmployeeID string `json:"employeeId,omitempty"`
	Role       string `json:"role"`
}

type Account struct {
	Password string
	Role     string
}

type AssessmentSubmission struct {
	ID          string      `json:"id"`
	EmployeeID  string      `json:"employeeId"`
	Employee    string      `json:"employee"`
	Manager     string      `json:"manager"`
	Year        string      `json:"year"`
	SubmittedAt string      `json:"submittedAt"`
	Status      string      `json:"status"`
	Assessment  interface{} `json:"assessment"`
}

type Employee struct {
	ID                string  `json:"id"`
	Name              string  `json:"name"`
	Department        string  `json:"department"`
	Position          string  `json:"position"`
	Salary            float64 `json:"salary"`
	Grade             string  `json:"grade"`
	AdjustmentPercent float64 `json:"adjustmentPercent"`
	EvaluationStatus  string  `json:"evaluationStatus"`
}

var employees = []Employee{
	{ID: "EMP001", Name: "สมชาย ใจดี", Department: "บริหาร", Position: "ผู้จัดการฝ่ายบุคคล", Salary: 55000, Grade: "A", AdjustmentPercent: 6, EvaluationStatus: "อนุมัติแล้ว"},
	{ID: "EMP002", Name: "สมหญิง รักงาน", Department: "การตลาด", Position: "หัวหน้าฝ่ายการตลาด", Salary: 48000, Grade: "A", AdjustmentPercent: 6, EvaluationStatus: "อนุมัติแล้ว"},
	{ID: "EMP003", Name: "กิตติพงษ์ มีสุข", Department: "เทคโนโลยีสารสนเทศ", Position: "นักพัฒนาซอฟต์แวร์อาวุโส", Salary: 45000, Grade: "B+", AdjustmentPercent: 4.5, EvaluationStatus: "อนุมัติแล้ว"},
	{ID: "EMP004", Name: "นภัสสร แสงทอง", Department: "การเงิน", Position: "นักบัญชี", Salary: 36000, Grade: "B", AdjustmentPercent: 3, EvaluationStatus: "อนุมัติแล้ว"},
	{ID: "EMP005", Name: "ธนกร ตั้งใจ", Department: "ฝ่ายขาย", Position: "ผู้จัดการฝ่ายขาย", Salary: 52000, Grade: "A", AdjustmentPercent: 6, EvaluationStatus: "อนุมัติแล้ว"},
	{ID: "EMP006", Name: "ปวีณา สุขใจ", Department: "ทรัพยากรบุคคล", Position: "เจ้าหน้าที่บุคคล", Salary: 30000, Grade: "B", AdjustmentPercent: 3, EvaluationStatus: "อนุมัติแล้ว"},
	{ID: "EMP007", Name: "วรวิทย์ ชาญชัย", Department: "เทคโนโลยีสารสนเทศ", Position: "นักวิเคราะห์ระบบ", Salary: 40000, Grade: "B+", AdjustmentPercent: 4.5, EvaluationStatus: "รออนุมัติ"},
	{ID: "EMP008", Name: "ชลธิชา พรหมมา", Department: "การตลาด", Position: "เจ้าหน้าที่การตลาด", Salary: 28000, Grade: "B", AdjustmentPercent: 3, EvaluationStatus: "อนุมัติแล้ว"},
	{ID: "EMP009", Name: "ศุภชัย วัฒนะ", Department: "ปฏิบัติการ", Position: "หัวหน้าฝ่ายปฏิบัติการ", Salary: 47000, Grade: "A", AdjustmentPercent: 6, EvaluationStatus: "อนุมัติแล้ว"},
	{ID: "EMP010", Name: "อรทัย จันทร์ดี", Department: "บริการลูกค้า", Position: "หัวหน้าทีมบริการลูกค้า", Salary: 35000, Grade: "B", AdjustmentPercent: 3, EvaluationStatus: "รอประเมิน"},
	{ID: "EMP011", Name: "ณัฐพล เก่งกล้า", Department: "ฝ่ายขาย", Position: "เจ้าหน้าที่ฝ่ายขาย", Salary: 27000, Grade: "C+", AdjustmentPercent: 1.5, EvaluationStatus: "อนุมัติแล้ว"},
	{ID: "EMP012", Name: "พรทิพย์ บุญมี", Department: "การเงิน", Position: "เจ้าหน้าที่การเงิน", Salary: 29000, Grade: "B+", AdjustmentPercent: 4.5, EvaluationStatus: "อนุมัติแล้ว"},
	{ID: "EMP013", Name: "เอกภพ รุ่งเรือง", Department: "ปฏิบัติการ", Position: "เจ้าหน้าที่ปฏิบัติการ", Salary: 26000, Grade: "B", AdjustmentPercent: 3, EvaluationStatus: "อนุมัติแล้ว"},
	{ID: "EMP014", Name: "กมลชนก สายใจ", Department: "บริการลูกค้า", Position: "เจ้าหน้าที่บริการลูกค้า", Salary: 25000, Grade: "A", AdjustmentPercent: 6, EvaluationStatus: "อนุมัติแล้ว"},
	{ID: "EMP015", Name: "ธีรภัทร มั่นคง", Department: "เทคโนโลยีสารสนเทศ", Position: "ผู้ดูแลระบบ", Salary: 38000, Grade: "B+", AdjustmentPercent: 4.5, EvaluationStatus: "อนุมัติแล้ว"},
	{ID: "EMP016", Name: "สุดารัตน์ แก้วใส", Department: "ทรัพยากรบุคคล", Position: "เจ้าหน้าที่ฝึกอบรม", Salary: 32000, Grade: "B", AdjustmentPercent: 3, EvaluationStatus: "รออนุมัติ"},
	{ID: "EMP017", Name: "อาทิตย์ ขยันดี", Department: "การตลาด", Position: "นักออกแบบสื่อ", Salary: 31000, Grade: "C+", AdjustmentPercent: 1.5, EvaluationStatus: "รอประเมิน"},
	{ID: "EMP018", Name: "รัตนา นุ่มนวล", Department: "บริหาร", Position: "เลขานุการผู้บริหาร", Salary: 34000, Grade: "B", AdjustmentPercent: 3, EvaluationStatus: "อนุมัติแล้ว"},
	{ID: "EMP019", Name: "ภาคิน คงมั่น", Department: "ฝ่ายขาย", Position: "เจ้าหน้าที่ดูแลลูกค้า", Salary: 28500, Grade: "B+", AdjustmentPercent: 4.5, EvaluationStatus: "อนุมัติแล้ว"},
	{ID: "EMP020", Name: "ศิริพร ทองดี", Department: "การเงิน", Position: "ผู้ตรวจสอบบัญชี", Salary: 42000, Grade: "A", AdjustmentPercent: 6, EvaluationStatus: "อนุมัติแล้ว"},
}

func main() {
	r := gin.Default()

	r.Use(cors.Default())
	accounts := map[string]Account{
		"Ying":  {Password: "1234", Role: "employee"},
		"First": {Password: "HR@1234", Role: "hr"},
		"Tob":   {Password: "Manager@1234", Role: "manager"},
	}
	for _, employee := range employees {
		firstName := employee.Name
		if fields := strings.Fields(employee.Name); len(fields) > 0 {
			firstName = fields[0]
		}
		accounts[firstName] = Account{
			Password: fmt.Sprintf("CDG@%s", employee.ID[3:]),
			Role:     "employee",
		}
	}
	var usersMu sync.RWMutex
	submissions := make(map[string]AssessmentSubmission)
	var submissionsMu sync.RWMutex

	r.GET("/api/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	r.GET("/api/employees", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"count":     len(employees),
			"employees": employees,
		})
	})

	r.POST("/api/assessments", func(c *gin.Context) {
		var submission AssessmentSubmission
		if err := c.ShouldBindJSON(&submission); err != nil ||
			submission.Employee == "" || submission.Year == "" || submission.SubmittedAt == "" {
			c.JSON(http.StatusBadRequest, gin.H{"message": "ข้อมูลแบบประเมินไม่ครบถ้วน"})
			return
		}

		if submission.Manager == "" {
			submission.Manager = "Tob"
		}
		if submission.ID == "" {
			submission.ID = submission.EmployeeID + ":" + submission.Year
		}
		if submission.Status == "" {
			submission.Status = "pending"
		}

		submissionsMu.Lock()
		submissions[submission.ID] = submission
		submissionsMu.Unlock()
		c.JSON(http.StatusCreated, gin.H{"message": "ส่งแบบประเมินให้หัวหน้าเรียบร้อยแล้ว", "submission": submission})
	})

	r.GET("/api/manager/assessments", func(c *gin.Context) {
		manager := c.Query("manager")
		submissionsMu.RLock()
		result := make([]AssessmentSubmission, 0)
		for _, submission := range submissions {
			if manager == "" || submission.Manager == manager {
				result = append(result, submission)
			}
		}
		submissionsMu.RUnlock()
		c.JSON(http.StatusOK, gin.H{"count": len(result), "assessments": result})
	})

	r.POST("/api/manager/assessments/:id/approve", func(c *gin.Context) {
		submissionsMu.Lock()
		submission, exists := submissions[c.Param("id")]
		if exists {
			submission.Status = "approved"
			submissions[submission.ID] = submission
		}
		submissionsMu.Unlock()

		if !exists {
			c.JSON(http.StatusNotFound, gin.H{"message": "ไม่พบแบบประเมินที่ต้องการอนุมัติ"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "อนุมัติผลการประเมินเรียบร้อยแล้ว", "submission": submission})
	})

	r.POST("/api/auth/login", func(c *gin.Context) {
		var req LoginRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "กรอกข้อมูลไม่ถูกต้อง"})
			return
		}

		usersMu.RLock()
		account, exists := accounts[req.Username]
		usersMu.RUnlock()

		if exists && account.Role == req.Role && account.Password == req.Password {
			user := User{Username: req.Username, Name: req.Username, Role: account.Role}
			for _, employee := range employees {
				firstName := strings.Fields(employee.Name)[0]
				if firstName == req.Username {
					user = User{
						Username:   firstName,
						Name:       firstName,
						EmployeeID: employee.ID,
						Role:       account.Role,
					}
					break
				}
			}

			c.JSON(http.StatusOK, gin.H{
				"message": "เข้าสู่ระบบสำเร็จ",
				"token":   "mock-jwt-token-123",
				"user":    user,
			})
			return
		}

		if !exists || (req.Role != "employee" && req.Role != "hr" && req.Role != "manager") {
			c.JSON(http.StatusUnauthorized, gin.H{
				"field":   "username",
				"message": "ชื่อผู้ใช้ไม่ถูกต้อง",
			})
			return
		}

		c.JSON(http.StatusUnauthorized, gin.H{
			"field":   "password",
			"message": "รหัสผ่านไม่ถูกต้อง",
		})
	})

	r.POST("/api/auth/register", func(c *gin.Context) {
		var req RegisterRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"field": "form", "message": "กรอกข้อมูลให้ครบถ้วน"})
			return
		}

		if req.Password != req.ConfirmPassword {
			c.JSON(http.StatusBadRequest, gin.H{"field": "confirmPassword", "message": "รหัสผ่านไม่ตรงกัน"})
			return
		}

		usersMu.Lock()
		defer usersMu.Unlock()
		if _, exists := accounts[req.Username]; exists {
			c.JSON(http.StatusConflict, gin.H{"field": "username", "message": "ชื่อผู้ใช้นี้มีอยู่แล้ว"})
			return
		}

		accounts[req.Username] = Account{Password: req.Password, Role: "employee"}
		c.JSON(http.StatusCreated, gin.H{"message": "สมัครสมาชิกสำเร็จ"})
	})

	if err := r.Run(":8080"); err != nil {
		log.Fatal(err)
	}
}
