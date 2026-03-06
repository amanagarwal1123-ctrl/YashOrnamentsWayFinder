{
  "meta": {
    "product": "Chandni Chowk Jewellery Navigation PWA",
    "design_goals": [
      "Premium jewellery aesthetic (black/gold/ivory) with clarity-first navigation",
      "Mobile-first customer journey with large touch targets and outdoor readability",
      "Two business identities via QR (AJPL retail, Yash Ornaments wholesale) with strict feature gating",
      "Works on weak networks; offline-first route assets; graceful degradation for camera/compass"
    ],
    "personality": {
      "keywords": [
        "luxury",
        "trustworthy",
        "high-contrast",
        "directional",
        "calm under pressure",
        "operational"
      ],
      "do": [
        "Use strong hierarchy and clear CTAs; decoration is secondary",
        "Use gold as an accent/semantic highlight only",
        "Use subtle texture/noise to avoid flatness"
      ],
      "dont": [
        "Avoid ornate flourishes that reduce legibility",
        "Avoid heavy gradients; keep gradient usage under 20% of viewport",
        "Avoid tiny UI; minimum 44px touch targets"
      ]
    }
  },

  "brand_system": {
    "businesses": {
      "ajpl": {
        "name": "AJPL (Retail)",
        "brand_accent": "gold",
        "accent_hex": "#C8A24A",
        "accent_soft_hex": "#E7D6A1",
        "semantic": {
          "route_color": "#D3B15C",
          "pin_color": "#C8A24A"
        },
        "feature_flags": [
          "gold-rate-widget",
          "design-gallery",
          "rate-calculator"
        ]
      },
      "yash": {
        "name": "Yash Ornaments (Wholesale)",
        "brand_accent": "azure-blue (ops distinction, not gradient)",
        "accent_hex": "#1E5EFF",
        "accent_soft_hex": "#CFE0FF",
        "semantic": {
          "route_color": "#2A60FF",
          "pin_color": "#1E5EFF"
        },
        "feature_flags": []
      }
    },
    "token_strategy": {
      "approach": "Single base theme (ivory/ink) + per-business accent overrides applied after QR resolve.",
      "implementation_hint": "Set data attribute on html/body: data-business=\"ajpl\" | \"yash\" and override CSS variables under selectors."
    }
  },

  "typography": {
    "fonts": {
      "display": {
        "name": "Bodoni Moda",
        "use": "Hero brand title + key section headings only (avoid overuse for readability)",
        "google_fonts": "https://fonts.googleapis.com/css2?family=Bodoni+Moda:wght@500;600;700&display=swap"
      },
      "body": {
        "name": "Manrope",
        "use": "All UI labels, navigation steps, forms, dashboards",
        "google_fonts": "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap"
      },
      "mono": {
        "name": "IBM Plex Mono",
        "use": "Route codes, OTP, session IDs, coordinates",
        "google_fonts": "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&display=swap"
      }
    },
    "scale_tailwind": {
      "h1": "text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight",
      "h2": "text-base md:text-lg font-medium text-muted-foreground",
      "h3": "text-lg font-semibold",
      "body": "text-sm md:text-base",
      "small": "text-xs text-muted-foreground"
    },
    "numeric_readability": {
      "gold_rate": "Use tabular numbers: tabular-nums",
      "otp": "Use mono font + letter spacing: tracking-widest"
    }
  },

  "color_system": {
    "notes": [
      "Base background is warm ivory; app uses dark ink surfaces for camera/HUD and high-focus moments.",
      "Gold is used as an accent (borders, focus rings, icons, progress). Avoid gold for long text.",
      "Admin/Helpdesk use clearer neutrals and strong semantic colors for status."
    ],
    "css_custom_properties": {
      "base": {
        "--background": "42 45% 96%",
        "--foreground": "240 10% 8%",
        "--card": "42 55% 98%",
        "--card-foreground": "240 10% 10%",
        "--popover": "42 55% 98%",
        "--popover-foreground": "240 10% 10%",
        "--muted": "42 18% 92%",
        "--muted-foreground": "240 4% 40%",
        "--border": "42 14% 86%",
        "--input": "42 14% 86%",
        "--ring": "43 78% 52%",
        "--radius": "0.75rem",

        "--primary": "240 10% 8%",
        "--primary-foreground": "42 50% 96%",
        "--secondary": "42 22% 92%",
        "--secondary-foreground": "240 10% 10%",
        "--accent": "43 72% 52%",
        "--accent-foreground": "240 10% 8%",

        "--destructive": "0 78% 52%",
        "--destructive-foreground": "0 0% 98%",

        "--success": "146 42% 34%",
        "--warning": "38 92% 50%",
        "--info": "215 85% 46%",

        "--ink": "240 10% 8%",
        "--ivory": "42 45% 96%",
        "--gold": "43 72% 52%",
        "--gold-soft": "43 60% 84%"
      },
      "business_overrides": {
        "[data-business=\"ajpl\"]": {
          "--brand": "43 72% 52%",
          "--brand-foreground": "240 10% 8%"
        },
        "[data-business=\"yash\"]": {
          "--brand": "221 100% 56%",
          "--brand-foreground": "0 0% 100%"
        }
      },
      "dark_surface_for_hud": {
        "--hud-bg": "240 10% 6%",
        "--hud-fg": "42 50% 96%",
        "--hud-border": "240 6% 18%"
      },
      "admin_map_semantics": {
        "--dot-ajpl": "0 84% 54%",
        "--dot-yash": "221 100% 56%",
        "--dot-idle": "240 4% 55%"
      }
    },
    "gradients_texture": {
      "allowed_gradients": [
        {
          "name": "Hero Ivory Wash",
          "usage": "Landing header background only (<= 20% viewport)",
          "css": "bg-[radial-gradient(1200px_circle_at_20%_0%,hsl(43_72%_52%_/0.12),transparent_55%),radial-gradient(900px_circle_at_80%_10%,hsl(42_45%_96%_/1),transparent_60%)]"
        },
        {
          "name": "Map Vignette (non-reading)",
          "usage": "Treasure map canvas overlay edges only",
          "css": "bg-[radial-gradient(60%_60%_at_50%_40%,transparent_55%,rgba(0,0,0,0.28)_100%)]"
        }
      ],
      "noise_overlay": {
        "usage": "Apply subtle grain on ivory sections and cards",
        "css_snippet": ".noise:before{content:\"\";position:absolute;inset:0;background-image:url('https://www.transparenttextures.com/patterns/asfalt-dark.png');opacity:.05;pointer-events:none;mix-blend-mode:multiply;}"
      }
    }
  },

  "layout_and_grid": {
    "mobile_first": {
      "max_width": "max-w-[480px] for customer flows; allow full-width map canvases",
      "page_padding": "px-4",
      "section_spacing": "py-6",
      "stacking": "Use single-column with bottom sheets/drawers for secondary actions"
    },
    "admin_responsive": {
      "breakpoints": {
        "md": "Split layout: left nav rail + main",
        "lg": "Two-column dashboards with charts + tables"
      },
      "density": "Admin can be denser but keep row height >= 44px"
    },
    "safe_areas": {
      "pwa_notch": "Use env(safe-area-inset-*) padding for bottom action bars",
      "bottom_cta": "Sticky bottom bar with blur + border for key actions"
    }
  },

  "component_path": {
    "shadcn_primary": {
      "buttons": "/app/frontend/src/components/ui/button.jsx",
      "cards": "/app/frontend/src/components/ui/card.jsx",
      "badges": "/app/frontend/src/components/ui/badge.jsx",
      "tabs": "/app/frontend/src/components/ui/tabs.jsx",
      "dialog": "/app/frontend/src/components/ui/dialog.jsx",
      "drawer": "/app/frontend/src/components/ui/drawer.jsx",
      "sheet": "/app/frontend/src/components/ui/sheet.jsx",
      "tooltip": "/app/frontend/src/components/ui/tooltip.jsx",
      "progress": "/app/frontend/src/components/ui/progress.jsx",
      "table": "/app/frontend/src/components/ui/table.jsx",
      "input": "/app/frontend/src/components/ui/input.jsx",
      "textarea": "/app/frontend/src/components/ui/textarea.jsx",
      "select": "/app/frontend/src/components/ui/select.jsx",
      "checkbox": "/app/frontend/src/components/ui/checkbox.jsx",
      "switch": "/app/frontend/src/components/ui/switch.jsx",
      "calendar": "/app/frontend/src/components/ui/calendar.jsx",
      "input_otp": "/app/frontend/src/components/ui/input-otp.jsx",
      "sonner_toasts": "/app/frontend/src/components/ui/sonner.jsx"
    },
    "recommended_custom_components_to_create": {
      "BrandHeader": "Customer landing + route selection header with crest + trust chips",
      "BottomActionBar": "Sticky action bar with 2 primary actions + overflow drawer",
      "CheckpointStepCard": "Photo + direction arrow + distance + next CTA",
      "TreasureMapCanvas": "Stylized route line, pins, fog-of-war",
      "CameraHUDOverlay": "Compass ring + arrow + ‘recenter’ + torch + fallback",
      "LiveSessionDotLegend": "Admin map legend and filters",
      "AssistanceQueueRow": "Helpdesk queue with status chips + SLA timer"
    }
  },

  "core_page_blueprints": {
    "customer": {
      "landing_qr": {
        "layout": [
          "Top: BrandHeader (business name, subtle divider, trust chips: ‘Offline ready’, ‘Helpdesk available’)",
          "Middle: Primary card with ‘Start Navigation’ + ‘Where am I’",
          "Bottom: quick links: Help / Call / WhatsApp (BottomActionBar)"
        ],
        "cta": {
          "primary": "Start navigation",
          "secondary": "Where am I"
        }
      },
      "route_selection": {
        "pattern": "Card list with radio-group style selection + map preview thumbnail (aspect-ratio)",
        "components": [
          "Card",
          "RadioGroup",
          "Badge (ETA, difficulty)",
          "Button (Start)"
        ],
        "microcopy": "Use location anchors: ‘From Metro Gate 2’, ‘From Paranthe Wali Gali’"
      },
      "checkpoint_navigation": {
        "pattern": "Top sticky progress + main step card + bottom actions",
        "top": "Progress (Step x of y) + Compass status chip (GPS weak) + Recenter button",
        "main": "CheckpointStepCard with photo/video carousel + big arrow direction + distance",
        "bottom": "BottomActionBar: Next checkpoint, Help me, Treasure map",
        "accessibility": "Offer ‘Text-only directions’ toggle when media not available"
      },
      "treasure_map": {
        "pattern": "Full-width canvas + bottom sheet listing checkpoints",
        "visual": [
          "Ivory ‘paper’ base + subtle vignette",
          "Route line in business brand color",
          "Pins with numbered badges",
          "Fog-of-war (masked) for not-yet-reached checkpoints"
        ],
        "interaction": "Tap pin -> open Drawer with photo + ‘Navigate to this’ if allowed"
      },
      "camera_guidance": {
        "pattern": "Fullscreen camera feed + CameraHUDOverlay",
        "fallback": "If no camera permission: show illustrated arrow + compass + ‘Open treasure map’",
        "hud": [
          "Compass ring (top center)",
          "Big direction arrow (center)",
          "Distance chip (below)",
          "Buttons: Torch (if supported), Recenter, Exit"
        ]
      },
      "help_support": {
        "pattern": "Quick actions first; form last",
        "actions": [
          "Call now",
          "WhatsApp",
          "Request callback (Dialog/Drawer form)"
        ],
        "trust": "Show business hours + expected response time"
      },
      "arrival_success": {
        "pattern": "Minimal celebratory but premium: gold outline icon + next actions",
        "actions": [
          "Save route offline",
          "Share location",
          "Browse AJPL gallery (AJPL only)"
        ]
      }
    },
    "admin": {
      "dashboard": {
        "pattern": "KPI cards + live map preview + recent assistance requests",
        "components": [
          "Card grid",
          "Tabs (AJPL/Yash/All)",
          "Table (recent sessions)"
        ]
      },
      "live_session_map": {
        "pattern": "Map with dot clusters + right-side sheet filters on desktop / bottom sheet on mobile",
        "legend": "Red=AJPL, Blue=Yash (as per requirement).",
        "filters": [
          "Business toggle",
          "Status: Active / Idle / Needs help",
          "Search by session ID/phone"
        ]
      },
      "route_checkpoint_management": {
        "pattern": "Master-detail: left list, right editor",
        "editor": "Forms with media upload placeholders; show last updated + audit chips"
      },
      "analytics": {
        "pattern": "Segmented dashboards (Tabs) + charts + tables",
        "charts": "Use Recharts; keep background solid (no gradients)"
      }
    },
    "helpdesk": {
      "assistance_queue": {
        "pattern": "Queue list with sticky filters + notification bell",
        "row": "AssistanceQueueRow: customer name/anon, business, last checkpoint, SLA timer, actions",
        "actions": [
          "Call",
          "WhatsApp",
          "Send quick instruction",
          "Mark resolved"
        ]
      }
    },
    "trainer": {
      "route_recording": {
        "pattern": "Big recording controls + checkpoint capture card",
        "controls": [
          "Start recording",
          "Add checkpoint",
          "Attach photo",
          "Mark as landmark"
        ],
        "safety": "Always show GPS accuracy chip + offline storage status"
      }
    }
  },

  "buttons_and_controls": {
    "button_shape": "Premium / Elegant: rounded-lg (10–12px), tall touch height",
    "sizes": {
      "primary": "h-12 px-5 text-base",
      "secondary": "h-11 px-4 text-sm",
      "icon": "h-12 w-12"
    },
    "variants": {
      "primary": {
        "style": "Ink background with subtle gold focus ring",
        "tailwind": "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.92)] focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]",
        "notes": "Primary CTA should be dark for outdoor readability"
      },
      "brand": {
        "style": "Business accent (AJPL gold / Yash blue) used for badges, route pins, and selected states; use sparingly for large buttons",
        "tailwind": "bg-[hsl(var(--brand))] text-[hsl(var(--brand-foreground))] hover:bg-[hsl(var(--brand)/0.92)]"
      },
      "secondary": {
        "style": "Ivory card button with border",
        "tailwind": "bg-[hsl(var(--card))] border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]"
      },
      "danger": {
        "style": "Solid destructive",
        "tailwind": "bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))]"
      }
    }
  },

  "motion_and_microinteractions": {
    "library": {
      "recommend": "framer-motion",
      "install": "npm i framer-motion",
      "usage": [
        "Page transitions: fade/slide 8–12px",
        "Bottom sheet entrance: slide-up",
        "Checkpoint completion: subtle scale (1.0 -> 1.02) + shimmer on progress"
      ]
    },
    "principles": [
      "No universal transition: never use transition-all",
      "Use duration-150 to duration-250 for taps; ease-out",
      "Respect prefers-reduced-motion"
    ],
    "specifics": {
      "button": "hover: translateY(-1px) on desktop only; active: scale-[0.98]",
      "map_pins": "pulse for ‘current checkpoint’ only; avoid too much motion",
      "toast": "Use sonner; short and actionable"
    }
  },

  "data_testid_convention": {
    "rules": [
      "All interactive and key informational elements must include data-testid",
      "Use kebab-case describing role not appearance"
    ],
    "examples": {
      "landing_primary_cta": "data-testid=\"landing-start-navigation-button\"",
      "route_select_card": "data-testid=\"route-select-option-card\"",
      "checkpoint_next": "data-testid=\"checkpoint-next-button\"",
      "help_whatsapp": "data-testid=\"help-whatsapp-button\"",
      "admin_live_map": "data-testid=\"admin-live-session-map\"",
      "gold_rate_value": "data-testid=\"ajpl-gold-rate-value\""
    }
  },

  "iconography": {
    "library": "lucide-react (preferred) or FontAwesome CDN",
    "notes": [
      "Use simple, directional icons: navigation, compass, phone, message-circle",
      "Avoid emoji icons"
    ]
  },

  "maps_and_visualization": {
    "treasure_map_render": {
      "recommendation": "Use a simple canvas/SVG approach first; keep payload small.",
      "optional_library": {
        "name": "d3",
        "install": "npm i d3",
        "use_cases": [
          "Route polyline interpolation",
          "Pin layouts",
          "Mini analytics charts"
        ]
      },
      "fog_of_war": "Use a mask layer in SVG/canvas; reveal segments as checkpoints completed."
    },
    "charts_admin": {
      "library": "recharts",
      "install": "npm i recharts",
      "patterns": [
        "Segment tabs: All/AJPL/Yash",
        "Empty states: skeleton then ‘No data yet’ card"
      ]
    }
  },

  "pwa_offline_guidelines": {
    "priority_assets": [
      "Route list + metadata",
      "Checkpoint thumbnails",
      "Text-only directions",
      "Critical icons"
    ],
    "ui_patterns": [
      "Offline chip in header",
      "Skeleton + cached fallback",
      "Explicit download for route button"
    ]
  },

  "image_urls": {
    "hero_or_brand": [
      {
        "category": "placeholder-brand-texture",
        "description": "Dark premium visual for headers; use as blurred background only, never behind long text",
        "url": "https://images.unsplash.com/photo-1632758479790-50d04c86b97d?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85"
      }
    ],
    "environment_or_store": [
      {
        "category": "store-placeholder",
        "description": "General jewellery retail placeholder imagery for AJPL gallery landing card",
        "url": "https://images.unsplash.com/photo-1657548492767-6c69b434cef7?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85"
      }
    ],
    "texture": [
      {
        "category": "ivory-texture",
        "description": "Use as subtle background in treasure map paper sections (low opacity)",
        "url": "https://images.unsplash.com/photo-1580122252289-8eccefa9ce2e?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85"
      }
    ]
  },

  "instructions_to_main_agent": {
    "global_css_updates": [
      "Replace current default shadcn tokens in /app/frontend/src/index.css with the ‘css_custom_properties.base’ values above; keep .dark tokens if needed but prefer light ivory for customer flows.",
      "Remove center-aligned starter styles from App.css; App.css should not impose layout."
    ],
    "business_theming": [
      "On QR resolve, set <html data-business=...> and apply brand token overrides.",
      "Gated features: ensure AJPL-only pages/components are hidden/blocked for Yash."
    ],
    "customer_navigation": [
      "Use BottomActionBar and Drawer/Sheet patterns for quick actions; keep CTA reachable by thumb.",
      "Checkpoint page must prioritize: direction arrow, distance, next action, help.",
      "Always provide text-only fallback for camera/compass flows."
    ],
    "admin_helpdesk": [
      "Admin map uses required dot colors: AJPL red, Yash blue. Keep legend always visible.",
      "Use Table + Tabs for segmentation; avoid decorative backgrounds on dashboards."
    ],
    "testing": [
      "Add data-testid to every interactive element and key displayed values (kebab-case)."
    ],
    "js_files_note": "Project uses .js/.jsx. Create components as .jsx and keep exports named for components; pages default export."
  },

  "GENERAL_UI_UX_DESIGN_GUIDELINES": [
    "- You must **not** apply universal transition. Eg: `transition: all`. This results in breaking transforms. Always add transitions for specific interactive elements like button, input excluding transforms",
    "- You must **not** center align the app container, ie do not add `.App { text-align: center; }` in the css file. This disrupts the human natural reading flow of text",
    "- NEVER: use AI assistant Emoji characters like`🤖🧠💭💡🔮🎯📚🎭🎬🎪🎉🎊🎁🎀🎂🍰🎈🎨🎰💰💵💳🏦💎🪙💸🤑📊📈📉💹🔢🏆🥇 etc for icons. Always use **FontAwesome cdn** or **lucid-react** library already installed in the package.json",
    " ",
    " **GRADIENT RESTRICTION RULE**",
    "NEVER use dark/saturated gradient combos (e.g., purple/pink) on any UI element.  Prohibited gradients: blue-500 to purple 600, purple 500 to pink-500, green-500 to blue-500, red to pink etc",
    "NEVER use dark gradients for logo, testimonial, footer etc",
    "NEVER let gradients cover more than 20% of the viewport.",
    "NEVER apply gradients to text-heavy content or reading areas.",
    "NEVER use gradients on small UI elements (<100px width).",
    "NEVER stack multiple gradient layers in the same viewport.",
    " ",
    "**ENFORCEMENT RULE:**",
    "    • Id gradient area exceeds 20% of viewport OR affects readability, **THEN** use solid colors",
    " ",
    "**How and where to use:**",
    "   • Section backgrounds (not content backgrounds)",
    "   • Hero section header content. Eg: dark to light to dark color",
    "   • Decorative overlays and accent elements only",
    "   • Hero section with 2-3 mild color",
    "   • Gradients creation can be done for any angle say horizontal, vertical or diagonal",
    " ",
    "- For AI chat, voice application, **do not use purple color. Use color like light green, ocean blue, peach orange etc",
    " ",
    "- Every interaction needs micro-animations - hover states, transitions, parallax effects, and entrance animations. Static = dead.",
    "   ",
    "- Use 2-3x more spacing than feels comfortable. Cramped designs look cheap.",
    " ",
    "- Subtle grain textures, noise overlays, custom cursors, selection states, and loading animations: separates good from extraordinary.",
    "   ",
    "- Before generating UI, infer the visual style from the problem statement (palette, contrast, mood, motion) and immediately instantiate it by setting global design tokens (primary, secondary/accent, background, foreground, ring, state colors), rather than relying on any library defaults. Don't make the background dark as a default step, always understand problem first and define colors accordingly",
    "    Eg: - if it implies playful/energetic, choose a colorful scheme",
    "           - if it implies monochrome/minimal, choose a black–white/neutral scheme",
    " ",
    "**Component Reuse:**",
    "\t- Prioritize using pre-existing components from src/components/ui when applicable",
    "\t- Create new components that match the style and conventions of existing components when needed",
    "\t- Examine existing components to understand the project's component patterns before creating new ones",
    " ",
    "**IMPORTANT**: Do not use HTML based component like dropdown, calendar, toast etc. You **MUST** always use `/app/frontend/src/components/ui/ ` only as a primary components as these are modern and stylish component",
    " ",
    "**Best Practices:**",
    "\t- Use Shadcn/UI as the primary component library for consistency and accessibility",
    "\t- Import path: ./components/[component-name]",
    " ",
    "**Export Conventions:**",
    "\t- Components MUST use named exports (export const ComponentName = ...)",
    "\t- Pages MUST use default exports (export default function PageName() {...})",
    " ",
    "**Toasts:**",
    "  - Use `sonner` for toasts\"",
    "  - Sonner component are located in `/app/src/components/ui/sonner.tsx`",
    " ",
    "Use 2–4 color gradients, subtle textures/noise overlays, or CSS-based noise to avoid flat visuals."
  ]
}
