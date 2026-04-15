package com.hanun.hanunan.domain.member.service;

import com.hanun.hanunan.domain.member.entity.Member;
import com.hanun.hanunan.domain.member.dto.MemberCreateDto;
import com.hanun.hanunan.domain.member.dto.MemberLoginDto;
import com.hanun.hanunan.domain.member.repository.MemberRepository;
import jakarta.transaction.Transactional;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@Transactional
public class MemberService {
    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;

    public MemberService(MemberRepository memberRepository, PasswordEncoder passwordEncoder) {
        this.memberRepository = memberRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public Member create(MemberCreateDto memberCreateDto){
        Member member = Member.builder()
                .email(memberCreateDto.getEmail())
                .password(passwordEncoder.encode(memberCreateDto.getPassword()))
                .build();
        memberRepository.save(member);
        return member;
    }

    public Member Login(MemberLoginDto memberLoginDto){
        Optional<Member> optMember = memberRepository.findByEmail(memberLoginDto.getEmail());
        if(!optMember.isPresent()){
            throw new IllegalArgumentException("email이 존재하지 않습니다.");
        }

        Member member = optMember.get();
        if(passwordEncoder.matches(memberLoginDto.getPassword(), member.getPassword())) {
            throw new IllegalArgumentException("password가 일치하지 않습니다.");
        }
        return member;

    }
}
