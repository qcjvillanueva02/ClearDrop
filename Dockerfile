FROM php:8.3-apache

RUN docker-php-ext-install pdo_sqlite \
    && mkdir -p /var/lib/cleardrop \
    && chown -R www-data:www-data /var/lib/cleardrop

ENV CLEARDROP_DB_PATH=/var/lib/cleardrop/cleardrop.sqlite
WORKDIR /var/www/html
COPY --chown=www-data:www-data . /var/www/html

EXPOSE 80
