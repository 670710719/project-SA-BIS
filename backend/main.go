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
	users := map[string]string{"Ying": "1234"}
	for _, employee := range employees {
		firstName := employee.Name
		if fields := strings.Fields(employee.Name); len(fields) > 0 {
			firstName = fields[0]
		}
		users[firstName] = fmt.Sprintf("CDG@%s", employee.ID[3:])
	}
	var usersMu sync.RWMutex

	r.GET("/api/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	r.GET("/api/employees", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"count":     len(employees),
			"employees": employees,
		})
	})

	r.POST("/api/auth/login", func(c *gin.Context) {
		var req LoginRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "กรอกข้อมูลไม่ถูกต้อง"})
			return
		}

		usersMu.RLock()
		password, exists := users[req.Username]
		usersMu.RUnlock()

		if exists && password == req.Password {
			user := User{Username: req.Username, Name: req.Username}
			for _, employee := range employees {
				firstName := strings.Fields(employee.Name)[0]
				if firstName == req.Username {
					user = User{
						Username:   firstName,
						Name:       firstName,
						EmployeeID: employee.ID,
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

		if !exists {
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
		if _, exists := users[req.Username]; exists {
			c.JSON(http.StatusConflict, gin.H{"field": "username", "message": "ชื่อผู้ใช้นี้มีอยู่แล้ว"})
			return
		}

		users[req.Username] = req.Password
		c.JSON(http.StatusCreated, gin.H{"message": "สมัครสมาชิกสำเร็จ"})
	})

	if err := r.Run(":8080"); err != nil {
		log.Fatal(err)
	}
}
