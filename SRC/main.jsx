import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Home,
  Building2,
  Wallet,
  Users,
  UserRound,
  Bell,
  Plus,
  Bot,
  Send,
  Search,
  ChevronRight,
  ChevronDown,
  CreditCard,
  BriefcaseBusiness,
  TrendingUp,
  Menu,
  X,
  Check,
  AlertTriangle,
  MessageSquare,
  LogOut,
  LogIn,
  UserPlus,
  Package,
  Landmark,
  ShieldCheck,
  Settings,
  RefreshCw,
  Save,
  Sparkles,
  MapPin,
  Eye,
  MessageCircle,
  Store,
  Wrench,
  PiggyBank,
  Gift,
  Activity,
  ClipboardList,
  Boxes,
  Receipt,
  ShoppingCart,
  CalendarClock,
  ListChecks,
} from "lucide-react";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

import "./styles.css";
import { apiGet, apiPost } from "./api";

/* =========================================================
   LIFEBOOST
