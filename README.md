# Form Assistant

AI가 PDF 양식을 분석하고 자동으로 채워주는 웹 앱입니다.

**Live Demo → https://form-assistant.onrender.com**

## 주요 기능

- PDF 업로드 시 AI가 모든 입력 항목을 자동으로 파악
- 텍스트, 날짜, 체크박스, 드롭다운, 서명 등 모든 필드 타입 지원
- 한국어·일본어·중국어 등 외국어 양식도 영어로 번역하여 안내
- 작성 완료 후 PDF 다운로드 (AcroForm 필드 자동 채우기 + 답변 요약 페이지 추가)

## 기술 스택

| 구분 | 기술 |
|------|------|
| Frontend | React 19, Vite, Tailwind CSS |
| Backend | Node.js, Express 5 |
| AI | Claude claude-opus-4-8 (Adaptive Thinking + Prompt Caching) |
| PDF | pdf-lib, pdf-parse |
| 배포 | Render |

## 로컬 실행

**1. 패키지 설치**
```bash
npm install
```

**2. 환경변수 설정**

프로젝트 루트에 `.env` 파일 생성:
```
ANTHROPIC_API_KEY=sk-ant-...
```

**3. 개발 서버 실행**
```bash
npm run dev
```

프론트엔드(`http://localhost:5173`)와 백엔드(`http://localhost:3001`)가 동시에 실행됩니다.

## 배포 (Render)

| 설정 | 값 |
|------|----|
| Build Command | `npm run build` |
| Start Command | `npm start` |
| `NODE_ENV` | `production` |
| `ANTHROPIC_API_KEY` | Anthropic 콘솔에서 발급 |
