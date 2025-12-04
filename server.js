import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json({ limit: "20mb" }));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;  // 🔒 Render 환경변수 사용

app.post("/analyze", async (req, res) => {
    try {
        const { image } = req.body;
        const base64 = image.split(",")[1];

        // 🔥 Gemini 요청 보내기
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    text: `
얼굴 사진을 분석해 닮은 동물 TOP3을 JSON으로만 출력하세요.

{
  "face_summary": "얼굴 특징 요약",
  "animals": [
    { "animal": "동물", "similarity": 숫자, "reason": "간단한 이유" },
    { "animal": "동물", "similarity": 숫자, "reason": "간단한 이유" },
    { "animal": "동물", "similarity": 숫자, "reason": "간단한 이유" }
  ]
}

규칙:
- JSON 외 텍스트 금지
- 코드블록 금지
- similarity 높은 순으로 정렬
                                    `
                                },
                                {
                                    inline_data: {
                                        mime_type: "image/jpeg",
                                        data: base64
                                    }
                                }
                            ]
                        }
                    ]
                })
            }
        );

        const data = await response.json();

        // 🔥 안전한 text 추출
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            console.log("⚠️ Gemini 응답 오류:", data);
            return res.status(500).json({ 
                error: "gemini_invalid_response", 
                detail: data 
            });
        }

        let clean;

        try {
            clean = text.replace(/```json|```/g, "").trim();
        } catch (e) {
            return res.status(500).json({
                error: "replace_failed",
                raw: text
            });
        }

        let json;
        try {
            json = JSON.parse(clean);
        } catch (e) {
            return res.status(500).json({
                error: "json_parse_failed",
                raw: clean
            });
        }

        return res.json(json);

    } catch (e) {
        console.log("🔥 서버 오류:", e);
        res.status(500).json({ error: "server_crash", detail: e.toString() });
    }
});

// Render가 포트를 지정해줌
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Server running on ${PORT}`);
});
