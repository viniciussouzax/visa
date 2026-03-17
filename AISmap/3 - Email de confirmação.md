Delivered-To: bra920618@gmail.com
Received: by 2002:a05:7412:5289:b0:1bb:291e:f2f with SMTP id hn9csp1249529rdb;
        Sun, 15 Mar 2026 21:29:16 -0700 (PDT)
X-Received: by 2002:a05:620a:4443:b0:8c7:16fb:ed45 with SMTP id af79cd13be357-8cdb5a5e8d0mr1368409485a.27.1773635355919;
        Sun, 15 Mar 2026 21:29:15 -0700 (PDT)
ARC-Seal: i=1; a=rsa-sha256; t=1773635355; cv=none;
        d=google.com; s=arc-20240605;
        b=QRIySEH9x9FN+KbSohEHCQsakaTFKH6bDYTWFJPVfo94U3hGMniJQcJ/5nQ5gCMo4E
         xUKb5HJ+O+WG9A38lSCnmT2BcYpBy6nGhY95Ii/+0kDx9Hped9wiWV/hPZv2AMuFiXvQ
         03rHJJSryzO/GrzqJjvPzAxRyn43jzgHzFgbDExFgNVb/wrHTOTBSGZ8ZcqtMR/p+MA6
         tj6a7WwlzqfVJAnRNRfIJjLIf9h9+XWbHbI6inu4d+8L0C1ad+rte1AZYr38aDbrUVPc
         +m+tNLnTKQI5pVgiQIS0iDWgMvjjsCEPtvB9wFm9f7B3uqsAWBkiroSV5eYEuRblrf+y
         bGtQ==
ARC-Message-Signature: i=1; a=rsa-sha256; c=relaxed/relaxed; d=google.com; s=arc-20240605;
        h=feedback-id:content-transfer-encoding:mime-version:subject
         :message-id:to:reply-to:from:date:dkim-signature:dkim-signature;
        bh=r4zGPxjn2P46G6TpagmrVjIzWx44eI9m7pVgWY7kMH8=;
        fh=n6UwM7mE5fieMD3rHu8H1mJf4vWnlLMx30mGRf4XqgM=;
        b=BhydrUJmHxGsG8q+YWcoa+LbazMzutJFpNnsxOk0RKwPM3qbed6mq9vPNJaOU1XHxn
         0pl8oQ6ULmD1Aa2q9RN9U8oPDlcrOUEDg6Q30taUqUGZZ5LhOwLyoRELKU4dY3svCh76
         42OwycUN3M11xsMCKKA4TR+pernAHyt191iRg60qDBGP3EblUA2HbO5rHRyG4Zek5ELl
         HKJsnBslkdBecmaZtyOv1DAGPMmUjxnEhL7XWTGTkUSPVhrPcgt70vkgyCdzWYsllzfa
         v8FrkO+LigroOoSzkFW961nyHsr7KTZiixCUpcD3yL5NHIul9bBJaA1zY7wf1cHLejYE
         syCQ==;
        dara=google.com
ARC-Authentication-Results: i=1; mx.google.com;
       dkim=pass header.i=@usvisa-info.com header.s=nqhfnb555kgijd424jyseue3s42zowmr header.b=n4Y9Zs8t;
       dkim=pass header.i=@amazonses.com header.s=224i4yxa5dv7c2xz3womw6peuasteono header.b="Q3zvh2/q";
       spf=pass (google.com: domain of 0100019cf4e7c2e3-bae53b00-9fa6-453e-9727-587ee94d5dc4-000000@amazonses.com designates 54.240.9.91 as permitted sender) smtp.mailfrom=0100019cf4e7c2e3-bae53b00-9fa6-453e-9727-587ee94d5dc4-000000@amazonses.com;
       dmarc=pass (p=NONE sp=NONE dis=NONE) header.from=usvisa-info.com
Return-Path: <0100019cf4e7c2e3-bae53b00-9fa6-453e-9727-587ee94d5dc4-000000@amazonses.com>
Received: from a9-91.smtp-out.amazonses.com (a9-91.smtp-out.amazonses.com. [54.240.9.91])
        by mx.google.com with ESMTPS id af79cd13be357-8cda21475adsi1449191485a.292.2026.03.15.21.29.15
        for <bra920618@gmail.com>
        (version=TLS1_3 cipher=TLS_AES_128_GCM_SHA256 bits=128/128);
        Sun, 15 Mar 2026 21:29:15 -0700 (PDT)
Received-SPF: pass (google.com: domain of 0100019cf4e7c2e3-bae53b00-9fa6-453e-9727-587ee94d5dc4-000000@amazonses.com designates 54.240.9.91 as permitted sender) client-ip=54.240.9.91;
Authentication-Results: mx.google.com;
       dkim=pass header.i=@usvisa-info.com header.s=nqhfnb555kgijd424jyseue3s42zowmr header.b=n4Y9Zs8t;
       dkim=pass header.i=@amazonses.com header.s=224i4yxa5dv7c2xz3womw6peuasteono header.b="Q3zvh2/q";
       spf=pass (google.com: domain of 0100019cf4e7c2e3-bae53b00-9fa6-453e-9727-587ee94d5dc4-000000@amazonses.com designates 54.240.9.91 as permitted sender) smtp.mailfrom=0100019cf4e7c2e3-bae53b00-9fa6-453e-9727-587ee94d5dc4-000000@amazonses.com;
       dmarc=pass (p=NONE sp=NONE dis=NONE) header.from=usvisa-info.com
DKIM-Signature: v=1; a=rsa-sha256; q=dns/txt; c=relaxed/simple; s=nqhfnb555kgijd424jyseue3s42zowmr; d=usvisa-info.com; t=1773635355; h=Date:From:Reply-To:To:Message-ID:Subject:Mime-Version:Content-Type:Content-Transfer-Encoding; bh=r4zGPxjn2P46G6TpagmrVjIzWx44eI9m7pVgWY7kMH8=; b=n4Y9Zs8tdmAoXf5ezF1ghjo+GbvL4d1wDF4eRWPjQrnecRjzatMpRGGr3S1Rh713 UyfPa2CuapWm8bh4FO2ENcc6Y7Ek0Y7YZ+GAQqBfWY58+Qjz+k99s0UCm42rQTkbbUi +WR0D2erSQ7SrTUvypc3a8DnUyz+sXZ/GfC2hhvs=
DKIM-Signature: v=1; a=rsa-sha256; q=dns/txt; c=relaxed/simple; s=224i4yxa5dv7c2xz3womw6peuasteono; d=amazonses.com; t=1773635355; h=Date:From:Reply-To:To:Message-ID:Subject:Mime-Version:Content-Type:Content-Transfer-Encoding:Feedback-ID; bh=r4zGPxjn2P46G6TpagmrVjIzWx44eI9m7pVgWY7kMH8=; b=Q3zvh2/qgL4drd5mPg03X3ltdPMb5QKuAUlb2vlS93T3NeBB/8Bl4b2YGtcfTBWX 32udxEaIVAzCXhYWednraBY7y//NqLQgqBJXJLLSAmcRdIf5Puevcdav1GF/rlIM88t VL2Ndv4aOLlZabTP9oDrJDReYwOa569M3O54n3qk=
Date: Mon, 16 Mar 2026 04:29:15 +0000
From: donotreply@usvisa-info.com
Reply-To: donotreply@usvisa-info.com
To: bra920618@gmail.com
Message-ID: <0100019cf4e7c2e3-bae53b00-9fa6-453e-9727-587ee94d5dc4-000000@email.amazonses.com>
Subject: Confirmation instructions
Mime-Version: 1.0
Content-Type: multipart/alternative; boundary="--==_mimepart_69b7871b1bcc2_355516d026020"
Content-Transfer-Encoding: 7bit
Feedback-ID: ::1.us-east-1.w7jUr47m89L6DRTlFEHTAW94tLbhNTrEerjhcVXkf2s=:AmazonSES
X-SES-Outgoing: 2026.03.16-54.240.9.91

----==_mimepart_69b7871b1bcc2_355516d026020
Content-Type: text/plain; charset=UTF-8
Content-Transfer-Encoding: quoted-printable

Uma nova conta de usu=C3=A1rio foi criada no Sistema de Agendamento e
Informa=C3=A7=C3=A3o de Vistos do Departamento de Estado Americano. Para
ativar sua conta clique no link abaixo:

https://ais.usvisa-info.com/pt-br/niv/users/confirmation?confirmation_token=
=3DsUABeguQwDYoidEz63sJ

Caso esteja tendo dificuldades com o link, voc=C3=AA tamb=C3=A9m pode
copi=C3=A1-lo e col=C3=A1-lo no seu navegador de internet.

Atenciosamente,

Equipe do Servi=C3=A7o de Informa=C3=A7=C3=B5es e Agendamento de Visto da G=
DIT

https://ais.usvisa-info.com/
----==_mimepart_69b7871b1bcc2_355516d026020
Content-Type: text/html; charset=UTF-8
Content-Transfer-Encoding: quoted-printable

<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.0 Transitional//EN" "http://www.w=
3.org/TR/REC-html40/loose.dtd">
<html><body><div dir=3D"ltr">
<p>Uma nova conta de usu=C3=A1rio foi criada no Sistema de Agendamento e In=
forma=C3=A7=C3=A3o de Vistos do Departamento de Estado Americano. Para ativ=
ar sua conta clique no link abaixo:</p>
<p><a href=3D"https://ais.usvisa-info.com/pt-br/niv/users/confirmation?conf=
irmation_token=3DsUABeguQwDYoidEz63sJ">https://ais.usvisa-info.com/pt-br/ni=
v/users/confirmation?confirmation_token=3DsUABeguQwDYoidEz63sJ</a></p>
<p>Caso esteja tendo dificuldades com o link, voc=C3=AA tamb=C3=A9m pode co=
pi=C3=A1-lo e col=C3=A1-lo no seu navegador de internet.</p>
<p>Atenciosamente,</p>
<p>Equipe do Servi=C3=A7o de Informa=C3=A7=C3=B5es e Agendamento de Visto d=
a GDIT<br><br><a href=3D"https://ais.usvisa-info.com/">https://ais.usvisa-i=
nfo.com/</a></p>
</div></body></html>

----==_mimepart_69b7871b1bcc2_355516d026020--