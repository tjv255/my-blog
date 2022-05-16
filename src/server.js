import express from 'express'
import { MongoClient } from 'mongodb'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
app.use(express.json())
app.use(express.static(path.join(__dirname, '/build'))) // tells our server where to serve static files such as images

const withDB = async (operations, res) => {
  try {
    const client = await MongoClient.connect('mongodb://localhost:27017', { useNewUrlParser: true })
    const db = client.db('my-blog')

    await operations(db)

    client.close()
  } catch (err) {
    res.status(500).json({ message: 'Error connecting to db', err })
  }
}

app.get('/api/articles/:name', async (req, res) => {
  withDB(async (db) => {
    const articleName = req.params.name

    const articleInfo = await db.collection('articles').findOne({ name: articleName })
    res.status(200).json(articleInfo)
  }, res)
}) 

app.post('/api/articles/:name/upvote', async (req, res) => {
  withDB(async (db) => {
    const articleName = req.params.name

    const articleInfo = await db.collection('articles').findOne({ name: articleName })
    await db.collection('articles').updateOne({ name: articleName  }, {
      '$set': {
        upvotes: articleInfo.upvotes + 1
      }
    })
    const updatedArticleInfo = await db.collection('articles').findOne({ name: articleName })

    res.status(200).json(updatedArticleInfo)
  }, res)

})

app.post('/api/articles/:name/add-comment', async (req, res) => {
  withDB(async (db) => {
    const { username, text } = req.body
    const articleName = req.params.name
    
    const articleInfo = await db.collection('articles').findOne({ name: articleName })
    await db.collection('articles').updateOne({ name: articleName }, {
      '$set': {
        comments: articleInfo.comments.concat({username, text}) 
      }
    })
    const updatedArticleInfo = await db.collection('articles').findOne({ name: articleName })
    res.status(200).json(updatedArticleInfo)
  }, res)
})

// all other routes should be passed to our app
// this allows our client site app to navigate through pages and process urls properly
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname + '/build/index.html'))
})

app.listen(8000, () => console.log('Listening on port 8000'))
