package hyakuta.family.server.web;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.Optional;

@Configuration
public class WebMvcConfigProvider implements WebMvcConfigurer {

    private final Optional<String> allowedHost;

    public WebMvcConfigProvider(
            @Value("${hyakuta.firstapp.allowed-host:#{null}}") Optional<String> allowedHost
    ) {
        this.allowedHost = allowedHost;
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        allowedHost.ifPresent(h -> {
            registry.addMapping("/**")
                    .allowedOrigins(h)
                    .allowedHeaders(CorsConfiguration.ALL)
                    .allowedMethods(CorsConfiguration.ALL);
        });
    }
}