import logging
import sys
import os

# Create logs directory if needed (optional, we stream to console)
# Configure format: Timestamp [Level] LoggerName: Message
LOG_FORMAT = "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
DATE_FORMAT = "%Y-%m-%d %H:%M:%S"

# Configure root logger to output to stdout
logging.basicConfig(
    level=logging.INFO,
    format=LOG_FORMAT,
    datefmt=DATE_FORMAT,
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)

def get_logger(name: str) -> logging.Logger:
    """
    Returns a customized logger instance with the given name.
    """
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)
    return logger
