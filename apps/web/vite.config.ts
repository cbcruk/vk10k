import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/**
 * GitHub Pages는 https://<user>.github.io/<repo>/ 하위에 얹히므로
 * 빌드 산출물의 asset 경로에 리포지토리 이름이 붙어야 한다.
 * 커스텀 도메인으로 옮기거나 루트에 얹을 때 여기를 '/'로 바꾼다.
 *
 * dev/preview에도 같은 값을 쓴다. `vite preview`의 command는 'serve'라
 * 빌드에만 base를 걸면 preview가 배포와 다른 경로를 서빙해 어긋난다.
 * dev 서버는 http://localhost:5173/vk10k/ 로 뜬다.
 */
const BASE_PATH = '/vk10k/'

export default defineConfig({
  plugins: [react()],
  base: BASE_PATH,
  server: { port: 5173 },
})
