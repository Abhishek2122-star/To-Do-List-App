const express = require('express');
const firebaseAdmin = require('firebase-admin');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

// Load Firebase service account key
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
try {
  const serviceAccount = require(serviceAccountPath);
  firebaseAdmin.initializeApp({
    credential: firebaseAdmin.credential.cert(serviceAccount),
    databaseURL: "https://todo-list-80c07.firebaseio.com" // Replace with actual Firebase DB URL
  });
} catch (error) {
  console.error("Error loading Firebase service account key. Make sure 'serviceAccountKey.json' exists.", error);
  process.exit(1); // Stop server if Firebase isn't set up correctly
}

const app = express();
const db = firebaseAdmin.firestore();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Create a new task
app.post("/tasks", async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Task text is required.' });
  
  try {
    const taskRef = db.collection('tasks').doc();
    await taskRef.set({
      text,
      createdAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
      completed: false
    });
    res.status(201).json({ id: taskRef.id, text, completed: false });
  } catch (error) {
    console.error('Error adding task:', error);
    res.status(500).json({ error: 'Error adding task: ' + error.message });
  }
});

// Fetch all tasks
app.get("/tasks", async (req, res) => {
  try {
    const snapshot = await db.collection('tasks').orderBy('createdAt', 'desc').get();
    const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Error fetching tasks: ' + error.message });
  }
});

// Delete a task
app.delete("/tasks/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await db.collection('tasks').doc(id).delete();
    res.status(200).json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Error deleting task: ' + error.message });
  }
});

// Update a task
app.put("/tasks/:id", async (req, res) => {
  const { id } = req.params;
  const { text, completed } = req.body;
  try {
    await db.collection('tasks').doc(id).update({ text, completed });
    res.status(200).json({ message: 'Task updated successfully' });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Error updating task: ' + error.message });
  }
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
