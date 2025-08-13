# PortfolioMax Branding Guide

## 🎨 Brand Identity

PortfolioMax is a professional investment portfolio management platform designed to help users manage their investments effectively and make informed financial decisions.

## 🏷️ Logo

### Primary Logo
- **File**: `/public/assets/images/portfoliomax-logo.svg`
- **Usage**: Main application header, marketing materials, documentation
- **Dimensions**: 200x60px (scalable SVG)

### Icon Only
- **File**: `/public/assets/images/portfoliomax-icon.svg`
- **Usage**: Sidebar, mobile navigation, favicon
- **Dimensions**: 40x40px (scalable SVG)

### Favicon
- **File**: `/public/assets/images/favicon.svg`
- **Usage**: Browser tabs, bookmarks
- **Dimensions**: 32x32px (scalable SVG)

## 🎨 Color Palette

### Primary Colors
- **Brand Blue**: `#3182CE` (Primary brand color)
- **Brand Blue Dark**: `#2C5282` (Secondary brand color)
- **Brand Blue Light**: `#4299E1` (Accent color)

### Neutral Colors
- **Gray 50**: `#F7FAFC` (Background)
- **Gray 100**: `#EDF2F7` (Light borders)
- **Gray 200**: `#E2E8F0` (Borders)
- **Gray 500**: `#718096` (Secondary text)
- **Gray 800**: `#1A202C` (Primary text)

### Semantic Colors
- **Success**: `#38A169` (Green for positive values)
- **Warning**: `#F59E0B` (Orange for alerts)
- **Error**: `#EF4444` (Red for errors)

## 🔤 Typography

### Font Family
- **Primary**: Inter (with system font fallbacks)
- **Monospace**: SF Mono (for code/data)

### Font Weights
- **Regular**: 400
- **Medium**: 500
- **Semibold**: 600
- **Bold**: 700

## 🎯 Design Principles

### Professional & Trustworthy
- Clean, modern design
- Consistent spacing and alignment
- Professional color scheme
- Clear visual hierarchy

### User-Friendly
- Intuitive navigation
- Clear call-to-action buttons
- Readable typography
- Accessible color contrast

### Financial Focus
- Data-driven visualizations
- Clear financial metrics
- Professional charts and graphs
- Trustworthy appearance

## 📱 Responsive Design

### Breakpoints
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

### Mobile Considerations
- Simplified navigation
- Touch-friendly buttons
- Optimized layouts
- Fast loading times

## 🛠️ Implementation

### Theme Configuration
The branding is implemented through a comprehensive Chakra UI theme located at:
- **File**: `src/theme/portfoliomax-theme.ts`
- **Provider**: `src/theme.tsx`

### Usage in Components
```typescript
// Use brand colors
<Button colorScheme="brand">Action</Button>
<Text color="brand.500">Brand Text</Text>

// Use semantic colors
<Badge colorScheme="success">Positive</Badge>
<Alert colorScheme="warning">Warning</Alert>
```

## 📋 Brand Guidelines

### Logo Usage
1. **Minimum Size**: 24px height for digital use
2. **Clear Space**: Equal to the height of the "P" in Portfolio
3. **Background**: Use on light backgrounds for best contrast
4. **Scaling**: Always scale proportionally

### Color Usage
1. **Primary**: Use brand blue for main actions and highlights
2. **Secondary**: Use gray tones for text and borders
3. **Semantic**: Use appropriate colors for status indicators
4. **Accessibility**: Ensure sufficient contrast ratios

### Typography
1. **Headings**: Use semibold or bold weights
2. **Body Text**: Use regular weight for readability
3. **Data**: Use monospace font for financial data
4. **Hierarchy**: Use size and weight to create clear hierarchy

## 🔄 Updates

When updating the brand:
1. Update all logo files (logo, icon, favicon)
2. Update theme configuration
3. Update component usage
4. Test across all screen sizes
5. Verify accessibility compliance

---

*This branding guide ensures consistent visual identity across all PortfolioMax touchpoints.* 