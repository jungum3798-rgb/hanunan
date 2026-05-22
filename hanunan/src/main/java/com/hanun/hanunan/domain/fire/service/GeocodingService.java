package com.hanun.hanunan.domain.fire.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;

@Slf4j
@Service("fireGeocodingService")
public class GeocodingService {

    @Value("${kakao.api.key}")
    private String kakaoApiKey;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public double[] getCoordinates(String address) {
        log.info("[FIRE-GEOCODE] 좌표 변환 시작: {}", address);

        String cleanAddress = removeLocationQualifiers(address);
        for (String candidate : buildAddressCandidates(cleanAddress)) {
            double[] result = searchByAddress(candidate);
            if (result != null) return result;

            log.info("[FIRE-GEOCODE] 좌표 후보 실패: {}", candidate);
        }

        log.warn("[FIRE-GEOCODE] 좌표 변환 실패: {}", cleanAddress);
        return null;
    }

    private List<String> buildAddressCandidates(String address) {
        LinkedHashSet<String> candidates = new LinkedHashSet<>();
        if (address == null || address.isBlank()) return List.of();

        String upToLotNumber = extractUpToLotNumber(address);
        if (upToLotNumber != null) candidates.add(upToLotNumber);

        String current = address;
        while (!current.isBlank()) {
            candidates.add(current);
            int lastSpace = current.lastIndexOf(' ');
            if (lastSpace <= 0) break;
            current = current.substring(0, lastSpace).trim();
        }

        return new ArrayList<>(candidates);
    }

    private String extractUpToLotNumber(String address) {
        String[] tokens = address.split(" ");
        StringBuilder sb = new StringBuilder();
        for (String token : tokens) {
            if (!sb.isEmpty()) sb.append(" ");
            sb.append(token);
            if (token.matches("\\d+(-\\d+)?")) {
                String result = sb.toString().trim();
                return result.equals(address) ? null : result;
            }
        }
        return null;
    }

    private String removeLocationQualifiers(String address) {
        if (address == null) return null;
        return address
                .replaceAll("\\s*(인근|부근|근처|주변|방면|쪽)\\s*", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private double[] searchByAddress(String address) {
        try {
            String encoded = URLEncoder.encode(address, StandardCharsets.UTF_8).replace("+", "%20");
            URI uri = URI.create("https://dapi.kakao.com/v2/local/search/address.json?query=" + encoded);

            JsonNode documents = requestKakaoApi(uri);
            if (documents != null && documents.isArray() && !documents.isEmpty()) {
                double lat = documents.get(0).path("y").asDouble();
                double lng = documents.get(0).path("x").asDouble();
                log.info("[FIRE-GEOCODE] 주소 검색 성공: {} -> lat={}, lng={}", address, lat, lng);
                return new double[]{lat, lng};
            }
        } catch (Exception e) {
            log.error("[FIRE-GEOCODE] 주소 검색 오류: {}", e.getMessage());
        }
        return null;
    }

    private JsonNode requestKakaoApi(URI uri) throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "KakaoAK " + kakaoApiKey);
        HttpEntity<Void> entity = new HttpEntity<>(headers);

        ResponseEntity<String> response = restTemplate.exchange(uri, HttpMethod.GET, entity, String.class);
        log.info("[FIRE-GEOCODE] Kakao API 응답: status={}, body={}", response.getStatusCode(), response.getBody());
        JsonNode root = objectMapper.readTree(response.getBody());
        if (root.has("errorType")) {
            log.error("[FIRE-GEOCODE] Kakao API 오류: {}", root);
        }
        return root.path("documents");
    }

    // ─────────────────────────────────────────
    // 역지오코딩: 좌표 → [시/도, 시/군/구, 읍/면/동]
    // ─────────────────────────────────────────
    public String[] reverseGeocode(double lat, double lng) {
        try {
            URI uri = URI.create(String.format(
                    "https://dapi.kakao.com/v2/local/geo/coord2regioncode.json?x=%s&y=%s",
                    lng, lat
            ));

            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "KakaoAK " + kakaoApiKey);
            HttpEntity<Void> entity = new HttpEntity<>(headers);

            ResponseEntity<String> response = restTemplate.exchange(uri, HttpMethod.GET, entity, String.class);
            JsonNode documents = objectMapper.readTree(response.getBody()).path("documents");

            if (documents.isArray() && !documents.isEmpty()) {
                // region_type "H"(행정동) 우선, 없으면 첫 번째
                JsonNode region = null;
                for (JsonNode doc : documents) {
                    if ("H".equals(doc.path("region_type").asText())) {
                        region = doc;
                        break;
                    }
                }
                if (region == null) region = documents.get(0);

                String r1 = region.path("region_1depth_name").asText(); // 예: 경기도
                String r2 = region.path("region_2depth_name").asText(); // 예: 양주시
                String r3 = region.path("region_3depth_name").asText(); // 예: 덕계동
                log.info("[REVERSE-GEOCODE] 결과: {} {} {}", r1, r2, r3);
                return new String[]{r1, r2, r3};
            }
        } catch (Exception e) {
            log.error("[REVERSE-GEOCODE] 실패: {}", e.getMessage());
        }
        return new String[]{};
    }
}

