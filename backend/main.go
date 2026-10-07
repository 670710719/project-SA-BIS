// backend/main.go
package main

import (
	"net/http"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

type LoginRequest struct {
	Username string `json:"username" binding:"required"` // เปลี่ยนเป็น Username
	Password string `json:"password" binding:"required"`
}

func main() {
	r := gin.Default()

	// อนุญาต CORS ให้ React ดึงข้อมูลได้
	r.Use(cors.Default())

	r.POST("/api/auth/login", func(c *gin.Context) {
		var req LoginRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "กรอกข้อมูลไม่ถูกต้อง"})
			return
		}

		// สมมติชื่อผู้ใช้ทดสอบตามรูปคือ Ying
		if req.Username == "Ying" && req.Password == "1234" {
			c.JSON(http.StatusOK, gin.H{
				"message": "เข้าสู่ระบบสำเร็จ",
				"token":   "mock-jwt-token-123",
			})
			return
		}

		c.JSON(http.StatusUnauthorized, gin.H{"message": "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"})
	})

	r.Run(":8080")
}