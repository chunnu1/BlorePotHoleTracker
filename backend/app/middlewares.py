import time

RATE_LIMIT_DURATION = 300  # 5 minutes
RATE_LIMIT_MAX = 3

# In-memory rate limiter cache
rate_limit_cache = {}

def rate_limiter(ip: str):
    current_time = time.time()
    
    if ip in rate_limit_cache:
        requests = rate_limit_cache[ip]
        requests = [req_time for req_time in requests if current_time - req_time < RATE_LIMIT_DURATION]
        
        if len(requests) >= RATE_LIMIT_MAX:
            return False
            
        requests.append(current_time)
        rate_limit_cache[ip] = requests
    else:
        rate_limit_cache[ip] = [current_time]
        
    return True
