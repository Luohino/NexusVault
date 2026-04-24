# Technical Architecture

NexusVault is a high-performance, developer-centric platform built on a distributed modern stack. This document outlines the core components and data flow of the "Anomaly Network."

## 1. High-Level Overview
The platform follows a classic Client-Server-Database architecture, optimized for real-time interaction and low-latency code rendering.

## 2. Frontend (The Command Center)
- **Framework:** React 18+ with Vite for ultra-fast HMR.
- **State:** Hybrid state management using React Hooks and Context for authentication.
- **Design:** Custom **Neo-Brutalist CSS System** defined in `index.css`. We prioritize raw visibility (high contrast) and hard shadows.
- **Markdown:** Custom Markdown rendering engine with theme support (Light/Dark).

## 3. Backend (The Logic Engine)
- **Server:** Node.js environment running an Express server.
- **API:** RESTful architecture with JWT authentication via **Clerk**.
- **Security:** Middleware layers for CORS, Rate Limiting, and Session Validation.

## 4. Data Layer (The Payloads)
- **Primary Database:** PostgreSQL hosted on **Supabase**.
- **ORM:** Drizzle ORM for type-safe database queries and migrations.
- **Storage:** Metadata (Users, Repos, Issues) is stored in SQL tables, while raw code content is indexed and served via optimized file-system streams.

## 5. Security & Authentication
- **Provider:** Clerk handles the entire identity lifecycle.
- **Authorization:** Supabase RLS (Row Level Security) ensures that users can only access the repositories and issues they are authorized to see.

## 6. Infrastructure
- **Hosting:** Vercel / AWS.
- **CDN:** Globally distributed edge nodes for asset delivery.

**Lead Architect:** Luohino
