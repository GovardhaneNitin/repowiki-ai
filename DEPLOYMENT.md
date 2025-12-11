# Vercel Deployment Instructions

## Environment Variables

Before deploying, you need to set the following environment variable in your Vercel project settings:

1. Go to your Vercel project dashboard: https://vercel.com/nitins-projects-cd11f02c/repowiki-ai
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variable:
   - **Name**: `GEMINI_API_KEY`
   - **Value**: Your Google Gemini API key
   - **Environment**: Production, Preview, and Development

## Manual Deployment Steps

If the automatic deployment isn't working:

1. Build the project locally:
   ```bash
   npm run build
   ```

2. Test the build:
   ```bash
   npm run preview
   ```

3. Deploy to Vercel:
   ```bash
   vercel --prod
   ```

## Important Notes

- Make sure the Gemini API key is set in Vercel's environment variables
- The build output is in the `dist` folder
- Vercel should automatically detect this as a Vite project

## Troubleshooting

If the site shows a blank page:
1. Check the browser console for errors (F12)
2. Verify the Gemini API key is set correctly in Vercel
3. Check Vercel deployment logs for build errors
4. Ensure all dependencies are installed correctly
