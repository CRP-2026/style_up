---
name: copilot-instructions
description: |
  Project-wide instructions for Native E-Commerce App built with Expo + React Native.
  Use when: creating new features, refactoring, UI changes, or implementing business logic.
applyTo:
  - 'app/**'
  - 'components/**'
  - 'features/**'
  - 'lib/**'
  - 'features/**/hooks/**'
---

## Project Overview
Đây là ứng dụng **E-commerce** sử dụng **Expo SDK 54** và **Expo Router**.  
Hiện tại ưu tiên phát triển UI mượt mà, tái sử dụng component và dần chuyển sang global state khi cần.

## Tech Stack (Phải tuân thủ)

- **Expo SDK 54** + Expo Router
- **TypeScript**
- **Styling**: **NativeWind** (Tailwind CSS) — Ưu tiên dùng `className`
- **State Management**: 
  - Local state → `useState`, `useReducer` + **Custom Hooks**
  - Global state → **Zustand** (đang triển khai dần, bắt đầu từ Cart và Auth)
  - Server state → Sẽ dùng **TanStack Query** sau
- **Form**: React Hook Form + Zod (khi có form phức tạp)

## Folder Structure & Rules

- `app/` → Routing và thin screen components (Expo Router)
- `features/{feature}/` → Business logic
  - `screens/` → Màn hình chính
  - `hooks/` → Custom hooks (local logic)
  - `store/` → Zustand stores (khi cần global state)
- `components/` → Reusable UI components
- `lib/` → Utils, API client, types, formatters

## Coding Rules (Must)

- Luôn dùng **Expo Router** cho navigation
- Styling chỉ dùng **NativeWind/Tailwind classes**
- Ưu tiên tái sử dụng component từ `components/` trước khi tạo mới
- Path alias: Dùng `~/` (ví dụ: `~/features/cart/hooks/useCart`)
- Xử lý đầy đủ loading, error, empty states
- Chạy `npm run lint` và `npm run format` trước khi commit

## State Management Guideline

- Hiện tại chủ yếu dùng **custom hooks** trong `features/*/hooks/`
- Khi state cần chia sẻ giữa nhiều màn hình (Cart, Auth...) → dùng **Zustand**
- Tránh duplicate logic giữa local hooks và global store

## PR Checklist

- Tóm tắt thay đổi
- Màn hình/features bị ảnh hưởng
- Testing steps trên Simulator + Emulator
- Screenshots cho thay đổi UI
- Đã chạy `npm run lint && npm run format`

## Type Usage Rules

- **Khi nào đặt ở `models.ts`:** Dùng chung toàn app (Product, User, Address, Category). Ổn định, ít thay đổi. Mục đích: contract nền tảng để nhiều feature tái sử dụng.
- **Khi đặt ở `lib/types`:** Type chỉ liên quan/chi tiết cho một feature (Order timeline, ProductVariant, Review). Nghiệp vụ hay thay đổi nhanh, hoặc có nhiều dạng (summary/detail).


