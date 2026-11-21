// Server lokal untuk development. Di Vercel dipakai api/index.js.
import app from './app.js'

const port = process.env.PORT || 3001
app.listen(port, () => console.log(`Arsiva API berjalan di http://localhost:${port}`))
