package com.hanun.hanunan.domain.member.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "users")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Member {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    private String password;

    private String profileImage;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private Role role = Role.USER;

    @Enumerated(EnumType.STRING)
    private SocialType socialType;

    private String socialId;

    @Builder
    public Member(String name, String email, String password, String profileImage,
                  Role role, SocialType socialType, String socialId) {
        this.name = name;
        this.email = email;
        this.password = password;
        this.profileImage = profileImage;
        this.role = role != null ? role : Role.USER;
        this.socialType = socialType;
        this.socialId = socialId;
    }

    public void update(String name, String profileImage) {
        this.name = name;
        this.profileImage = profileImage;
    }
}