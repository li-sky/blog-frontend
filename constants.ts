import { Post } from './types';

export const INITIAL_POSTS: Post[] = [
  {
    id: 1,
    title: 'Recommended Tech Stack for Beginners (Node.js & Frontend)',
    summary: 'You asked for a simple, replicable architecture to learn. Here is my definitive guide on what to choose and why.',
    status: 'published',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    content: `
## The Goal
You want to build a blog, learn Node.js/Frontend, but you struggle with design and rely on AI. You need a stack that is popular (for getting help), simple (for learning), and powerful (for the future).

## The Selection: The "T3" Spirit

I recommend a variation of the popular "T3 Stack" philosophy, but simplified for a beginner:

### 1. Frontend: React + TypeScript + Tailwind CSS
*   **React:** The industry standard. Don't learn vanilla HTML/JS first if your goal is building apps quickly. Learn React concepts (Components, State, Props).
*   **TypeScript:** It might seem harder at first, but it saves you from 80% of "undefined is not a function" errors. It helps AI help *you* better because the code structure is explicit.
*   **Tailwind CSS:** This solves your "ugly pages" problem. You don't write CSS files. You just add classes like \`p-4 rounded-lg bg-blue-500\`. It's replicable and looks good by default.

### 2. Backend: Next.js (The "Meta" Framework)
*   Instead of learning a separate "Frontend" (React) and "Backend" (Express/Node), learn **Next.js**.
*   It allows you to write your Backend API routes in the *same project* as your frontend.
*   It handles routing, image optimization, and deployment for you.
*   **Why Node?** Next.js runs on Node.js. You will learn Node concepts (File system, HTTP requests, Async/Await) while building your API routes in \`pages/api\` or the \`app\` directory.

### 3. Database: SQLite + Prisma
*   **SQLite:** A database in a single file. No servers to setup, no AWS bills. Perfect for a blog.
*   **Prisma:** This is an ORM (Object-Relational Mapper). It lets you interact with your database using TypeScript code instead of SQL queries. e.g., \`db.post.create({ data: ... })\`.

## Why this works for you
1.  **AI Synergy:** ChatGPT/Gemini are *excellent* at writing React and Tailwind code. You can paste a component and say "Make this look better using Tailwind," and it works perfectly.
2.  **Marketable:** This is exactly what companies are hiring for.
3.  **Simple:** One language (TypeScript) for everything.

## How to Start?
Don't start from scratch. Use a template.
1.  Run \`npx create-next-app@latest my-blog --typescript --tailwind --eslint\`
2.  Install Prisma: \`npm install prisma --save-dev\`
3.  Start hacking.

*This application you are looking at right now is built with React and Tailwind. Go to the Admin page to try writing a post with AI!*
    `
  },
  {
    id: 2,
    title: 'Why Tailwind CSS is a Cheat Code for Developers',
    summary: 'If you are not a designer, CSS files are your enemy. Utility classes are your best friend.',
    status: 'published',
    createdAt: new Date(Date.now() - 86400000).toISOString(), // Yesterday
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    content: `
Design is hard. Centering a div used to be a meme.

With Tailwind, you stop thinking about "Cascading Style Sheets" and start thinking about "Design Tokens".

- Want padding? \`p-4\`
- Want a shadow? \`shadow-lg\`
- Want it responsive? \`md:flex\`

The best part is that **AI understands Tailwind perfectly**. If you tell an AI "Give me a modern pricing card in Tailwind", it will give you code that you can copy-paste directly, and it will look professional.

This allows you to focus on the **logic** (Node.js/React) rather than fighting with pixels.
    `
  }
];
