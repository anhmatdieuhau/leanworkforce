// Simple rate limiter for Gemini API to respect free tier quota
// Free tier: 2 requests per minute for gemini-2.5-pro/flash

class RateLimiter {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private lastRequestTime = 0;
  private minDelay = 30000; // 30 seconds between requests (2 per minute = 1 every 30s)

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      
      // Wait if we need to respect the rate limit
      if (this.lastRequestTime > 0 && timeSinceLastRequest < this.minDelay) {
        const waitTime = this.minDelay - timeSinceLastRequest;
        console.log(`Rate limiting: waiting ${Math.round(waitTime / 1000)}s before next Gemini API call`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }

      const task = this.queue.shift();
      if (task) {
        this.lastRequestTime = Date.now();
        await task();
      }
    }

    this.processing = false;
  }

  // Retry with exponential backoff
  async executeWithRetry<T>(
    fn: () => Promise<T>,
    maxRetries = 3,
    baseDelay = 1000
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.execute(fn);
      } catch (error: any) {
        lastError = error;

        // Check if it's a rate limit error (429)
        if (error.status === 429) {
          if (attempt < maxRetries) {
            const delay = baseDelay * Math.pow(2, attempt);
            console.log(`Rate limit hit (429), retrying in ${delay / 1000}s (attempt ${attempt + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        } else {
          // Non-rate-limit error, don't retry
          throw error;
        }
      }
    }

    throw lastError;
  }
}

export const geminiRateLimiter = new RateLimiter();
