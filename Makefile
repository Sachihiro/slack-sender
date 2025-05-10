make start:
	npm run api
	npm run dev

make deploy:
	npm run build
	vercel --prod