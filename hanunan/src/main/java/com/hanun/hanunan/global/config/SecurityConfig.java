package com.hanun.hanunan.global.config;

import com.hanun.hanunan.global.security.JwtTokenFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity // Security 설정을 활성화함을 명시적으로 선언
@RequiredArgsConstructor // final 필드에 대한 생성자를 자동으로 생성
public class SecurityConfig {

    private final JwtTokenFilter jwtTokenFilter;
    // OAuth2 성공 핸들러를 사용하실 예정이라면 주석을 해제하세요.
    // private final GoogleOauth2LoginSuccess googleOauth2LoginSuccess;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return PasswordEncoderFactories.createDelegatingPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
                // 1. CORS 설정
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                // 2. CSRF 및 기본 인증 비활성화 (Stateless 구조이므로)
                .csrf(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable) // 폼 로그인도 사용하지 않는다면 명시적으로 비활성화

                // 3. 세션 관리: STATELESS 설정
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                // 4. URL별 권한 제어
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
                                "/member/create",
                                "/member/doLogin",
                                "/member/google/doLogin",
                                "/member/kakao/doLogin",
                                "/oauth2/**"
                        ).permitAll()
                        .anyRequest().authenticated())

                // 5. JWT 필터 위치 설정
                .addFilterBefore(jwtTokenFilter, UsernamePasswordAuthenticationFilter.class)

                // 6. OAuth2 로그인 (필요 시 주석 해제)
                /*
                .oauth2Login(oauth2 -> oauth2
                        .successHandler(googleOauth2LoginSuccess))
                */

                .build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        // 운영 단계에서는 실제 도메인을 넣는 것이 좋습니다.
        configuration.setAllowedOrigins(List.of("http://localhost:3000"));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setExposedHeaders(List.of("Authorization")); // 클라이언트에서 헤더를 읽을 수 있게 허용
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L); // 프리플라이트(Preflight) 요청 캐싱 시간

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}