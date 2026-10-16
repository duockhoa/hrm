-- NULL authentication method/grants preserve existing manually registered clients.
ALTER TABLE `oauth_clients`
    MODIFY `secret_hash` VARCHAR(255) NULL,
    ADD COLUMN `token_endpoint_auth_method` VARCHAR(32) NULL,
    ADD COLUMN `grant_types` JSON NULL;
