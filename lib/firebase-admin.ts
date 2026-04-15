import admin from "firebase-admin";

const serviceAccount = {
  type: "service_account",
  project_id: "airanh-ba64c",
  private_key_id: "d937d07d871b1d9603765665d88c978a22d2966e",
  private_key: `-----BEGIN PRIVATE KEY-----
MIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQC8+IaEt0Vss0y1\nswJqriVCtej7vUDwtEIaNmY4V71ZjTMy3T/sPmQ6AaOqH59fEnLWbxhfLz/HJROl\nuSTH7zszPeyX0GhqqVtN2QxYrnRshNQPEVZCCST+UqQpViLz9HPCtc9Duw1lH+Mh\nHPwfF7SjCugSzmroZyDIKoDzdn0mZdAF6OgNXCtebsTaB1dXThJ9Kf6HmFiWCqHd\nwuD6/WwUD0wGonmnCMZna/UKOV5BvOrurFWuej4C8rOU4xRV7GUF7FlLL0dHs38e\nk3mRDzxLz2rBrIm7pZGcBrHWvFBoJ/wfO1ntR+EmQyYQ8+CLJfXDtshpGhba7kS/\nGC7WaRPhAgMBAAECggEACZGnCUO8ihIUP7ktcfwKhVA29RRrqnn+ROndgSLGCht1\nJb9jmzUs7VEHYP8nff7KjHEeDf0v591I1D5wcd1e+o9XkoX/orMNgPDUcrh954bc\nXssuAZ8JQVrygXbobd17U2HusmfRW+G33yIbqY68BhY3k3LiE42jG2F88SVeQKh6\nUmZFDZwnxJFvMf7xVroYJ29oukbhxCrD3P86ZqGcECj3oQJR4SbiQ3lpA+t2c7Zg\n8IV5RD0TQsBvHTvraYay82aHZUMfO6Le+5mujTSfgnYzHBXk3zKPz+HQRlpqpcW1\nm019Yi2jPx3buN+h9Y+qQVsJQ7VIPQYI+fGw8hzitwKBgQDlK/5ojNvxJ9GnT7it\nTf73NKdfyetJwKLCGlLpQbYe3xwu5tbgo/Hw3AsjJ0tBHWlFKCfR8qGkPuW6bXDC\nV/PhAqGWGfzLU9wi3jAq7xR1+2UR9ayQkc60lCH+4BG2rWQ0TNIgBl9bYpnFzOUv\nVRCU66flI67bnBliQ2qiYltTWwKBgQDTF8Edn7xAlf7XRlXutnk/WCBY74fLr/tF\nPkSw6BSoFWAWRfrIOW+ZgXGStEUwmz5e51obm4Gf4tp18jrPf/lpw7VPPF5PHj07\njOPlxvayAJ94SW9HG2gAviQ1Q0Pla4W1ccE/GsZ0HAXCm01HcwLDUjE4D1kkSz41\nHYKvHhOGcwKBgQC0/98qUf4wZGOowkU4035JXpPHCuJDWNrzdPkA835UuaA3xuf1\nembO9evx8snz/rezADkbD4ftAiRM7rz9MZwTnhFjTNkk+fHGtDfU4QkG+evkmGWX\ntSFN7CVBeVVkM2QODpJy6rWLpr+OwvpMPOIgzFLJnjovhwVhX5+r6wT4OwKBgQCZ\n1wwEnO9DWo1ZModZ6149zen1Jsweo+hJtHG3Q8waG0nlsaZs2X79rpqowfxSyjEQ\nVScUS6aScW+o2ZoGs0t/ywON9X79xhn2Fl3YjcIoQ8/0iAAzIEQRloEo2BbZUh0l\n+PtPFCJhaDLCexA87BKtam84XecnTjbN2u3s1cyBBQKBgQDB0vj15QfoUnD1TSlL\njzI8GZ97Mb+ZEU/FJQ46dlJk5QjuJodJKqc0Tsz3rx7PhOJ2CiPCFA2NWGJCZe/W\nSp9wIEOIUN94hzk49Cm0TU9JmG/0Kl2ik9tfnNMv9q/BH6cqPncgN2j3ezKRHhfn\nO88N4dXNcRbgUB2LpwPrCJufEg==\n-----END PRIVATE KEY-----`,
  client_email: "firebase-adminsdk-fbsvc@airanh-ba64c.iam.gserviceaccount.com",
  client_id: "109299895659273947882",
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as any),
  });
}

export const adminMessaging = admin.messaging();
