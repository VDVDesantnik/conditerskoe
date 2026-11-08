FROM python:3.11-slim

WORKDIR /app

# Создаём непривилегированного системного пользователя для запуска приложения
RUN groupadd -r velvet && useradd -r -g velvet -d /app -s /sbin/nologin appuser

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY index.html style.css script.js server_bot.py db_postgres.py shema.sql velvet_data.json ./
COPY logos ./logos/

RUN chown -R appuser:velvet /app

USER appuser

EXPOSE 7860
ENV PORT=7860

CMD ["uvicorn", "server_bot:app", "--host", "0.0.0.0", "--port", "7860"]
