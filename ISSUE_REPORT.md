# Todos Overlay 앱 문제 보고서

**작성일**: 2026-01-30  
**버전**: 0.1.0

---

## 📋 관측된 문제

### 1. 창이 열리지 않는 문제 (Critical)

**증상**:
- 패키지된 `Todos.exe` 실행 시 작업 표시줄에는 앱이 표시됨
- 실제 창(Window)은 화면에 나타나지 않음
- 작업 표시줄 미리보기에도 내용이 표시되지 않음

**분석**:
- 개발 모드(`npx electron .`)에서는 창이 정상적으로 열림
- 패키지 빌드에서만 문제 발생
- 디버그 로그에서 `app.isPackaged: true` 상태의 로그 확인 필요

**잠재적 원인**:
1. ASAR 패키지 내 경로 해석 문제
2. `transparent: true` + `backgroundColor: "#00000000"` 설정으로 인해 콘텐츠가 렌더링되지 않음
3. `index.html` 로딩 실패

**추가된 디버그 코드**:
- `%APPDATA%/todos-overlay/debug.log`에 상세 로그 기록
- 창 생성, 경로, 로딩 이벤트 등 추적

---

### 2. electron-builder 빌드 실패 (Blocker)

**에러 메시지**:
```
remove C:\...\build_dist\win-unpacked\resources\app.asar: The process cannot access the file because it is being used by another process.
```

**증상**:
- `npm run dist` 실행 시 패키징 단계에서 실패
- `app.asar` 파일이 다른 프로세스에 의해 잠겨 있음
- `Todos.exe` 프로세스가 없어도 파일 잠금 해제되지 않음
- 파일 탐색기 재시작으로도 해결되지 않음

**시도한 해결 방법**:
- [x] `taskkill /f /im Todos.exe` → 프로세스 없음
- [x] `taskkill /f /im electron.exe` → 효과 없음
- [x] `Remove-Item -Recurse -Force build_dist` → 파일 잠금으로 실패
- [x] `Stop-Process -Name explorer -Force` → 효과 없음

**필요한 조치**:
- **컴퓨터 재시작** 후 빌드 재시도
- 또는 Resource Monitor에서 `app.asar` 파일을 잡고 있는 프로세스 확인

---

## 🛠️ 수정된 코드

### main.ts 변경사항

1. **screen import 추가**:
   ```typescript
   import { app, BrowserWindow, Menu, Tray, ipcMain, screen } from "electron";
   ```

2. **validateWindowBounds 함수 추가**:
   - 저장된 창 위치가 화면 밖인 경우 자동 재배치

3. **show: true 옵션 추가**:
   ```typescript
   const win = new BrowserWindow({
     show: true,  // 명시적 추가
     // ...
   });
   ```

4. **파일 로깅 시스템 추가**:
   ```typescript
   const debugLog = (message: string) => {
     fs.appendFileSync(logFilePath, `[${timestamp}] ${message}\n`);
   };
   ```

5. **ASAR 경로 수정**:
   ```typescript
   const indexPath = path.join(app.getAppPath(), "dist", "index.html");
   ```

---

## 📝 다음 단계

1. **컴퓨터 재시작**하여 파일 잠금 해제
2. `npm run dist` 실행으로 새 빌드 생성
3. `build_dist\win-unpacked\Todos.exe` 실행
4. `%APPDATA%\todos-overlay\debug.log` 확인하여 `app.isPackaged: true` 로그 분석
5. 로그 기반으로 실제 문제점 파악 및 수정

---

## 📁 관련 파일

| 파일 | 설명 |
|------|------|
| `electron/main.ts` | 메인 프로세스 (디버그 로깅 추가됨) |
| `build_dist/win-unpacked/Todos.exe` | 패키지된 실행파일 |
| `%APPDATA%/todos-overlay/debug.log` | 런타임 디버그 로그 |
| `%APPDATA%/todos-overlay/config.json` | 창 위치/설정 저장소 |
